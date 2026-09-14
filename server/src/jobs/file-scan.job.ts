// server/src/jobs/file-scan.job.ts
import net from 'net';
import fs from 'fs/promises';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { streamFile, deleteFileFromSupabase } from '../modules/file-storage/fileStorage.service';

const CHUNK_SIZE = 64 * 1024;

// clamd INSTREAM protocol: "zINSTREAM\0", then repeating
// [4-byte big-endian chunk length][chunk bytes], terminated by a zero-length
// chunk. Reply is "stream: OK" or "stream: <signature> FOUND".
const scanBufferWithClamav = (buffer: Buffer): Promise<'CLEAN' | 'INFECTED'> =>
  new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: env.CLAMAV_HOST, port: env.CLAMAV_PORT });
    let reply = '';
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };

    socket.setTimeout(env.CLAMAV_TIMEOUT_MS);
    socket.on('timeout', () => finish(() => reject(new Error('ClamAV scan timed out'))));
    socket.on('error', (err) => finish(() => reject(err)));
    socket.on('data', (data) => {
      reply += data.toString('utf8');
    });
    socket.on('close', () =>
      finish(() => {
        if (/\bFOUND\b/.test(reply)) return resolve('INFECTED');
        if (/\bOK\b/.test(reply)) return resolve('CLEAN');
        reject(new Error(`Unexpected ClamAV reply: ${reply.trim() || '(empty)'}`));
      })
    );

    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.length, 0);
        socket.write(header);
        socket.write(chunk);
      }
      socket.write(Buffer.from([0, 0, 0, 0]));
    });
  });

// Every uploaded file already passes extension + magic-byte allowlist
// validation before it is ever written to disk (fileValidation.util). This
// is the second layer: if a ClamAV daemon is configured, the stored file is
// actually scanned and quarantined on a hit. If it is not configured, the
// behaviour is unchanged from before — the document is released for viewing.
// Either way the UI's "pending scan" gate is honoured, so a file is never
// downloadable until this finishes.
export const runFileScan = async (documentId: string): Promise<void> => {
  const doc = await prisma.onboardingDocument.findUnique({
    where: { id: documentId },
    select: { id: true, storageKey: true },
  });
  if (!doc) return;

  if (!env.CLAMAV_HOST) {
    await prisma.onboardingDocument.update({ where: { id: documentId }, data: { scanStatus: 'CLEAN' } });
    return;
  }

  try {
    const buffer = await fs.readFile(streamFile(doc.storageKey));
    const result = await scanBufferWithClamav(buffer);

    if (result === 'INFECTED') {
      await prisma.onboardingDocument.update({ where: { id: documentId }, data: { scanStatus: 'INFECTED' } });
      // Remove the payload from disk immediately; the row stays so the audit
      // trail still shows that an infected file was attempted.
      await deleteFileFromSupabase(doc.storageKey);
      console.warn(`[file-scan] Infected upload quarantined and deleted (document ${documentId})`);
      return;
    }

    await prisma.onboardingDocument.update({ where: { id: documentId }, data: { scanStatus: 'CLEAN' } });
  } catch (err) {
    // Fail closed: leave the document un-viewable rather than releasing an
    // unscanned file because the scanner was unreachable.
    await prisma.onboardingDocument
      .update({ where: { id: documentId }, data: { scanStatus: 'ERROR' } })
      .catch(() => {});
    console.error('[file-scan] Virus scan failed, document held for review:', (err as Error)?.message);
  }
};