// server/src/modules/file-storage/fileStorage.service.ts (FULL REPLACEMENT — Supabase → local disk)
// NOTE: function names/signatures kept identical (uploadFileToSupabase, deleteFileFromSupabase,
// getSignedDownloadUrl) so onboarding.controller.ts / any other caller needs ZERO changes.
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env';
import { validateUploadedFile } from '../../common/utils/fileValidation.util';

const UPLOAD_DIR = path.resolve(env.UPLOAD_DIR);

const ensureUploadDir = async () => {
  await fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o750 });
};

const resolveWithinUploadDir = (storageKey: string): string => {
  const full = path.join(UPLOAD_DIR, path.basename(storageKey));
  const resolved = path.resolve(full);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) {
    throw { statusCode: 400, code: 'INVALID_PATH', message: 'Invalid file reference' };
  }
  return resolved;
};

export const uploadFileToSupabase = async (buffer: Buffer, originalName: string) => {
  const validation = await validateUploadedFile(buffer, originalName);
  if (!validation.valid) {
    throw { statusCode: 400, code: 'INVALID_FILE', message: validation.reason };
  }

  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
  const key = `${uuidv4()}-${Date.now()}${ext}`;

  await ensureUploadDir();
  const destPath = resolveWithinUploadDir(key);
  await fs.writeFile(destPath, buffer, { mode: 0o640 });

  return { storageKey: key, mimeType: validation.detectedMime!, sizeBytes: buffer.length };
};

// Best-effort cleanup — never blocks the calling operation if delete fails.
export const deleteFileFromSupabase = async (storageKey: string): Promise<void> => {
  try {
    const fullPath = resolveWithinUploadDir(storageKey);
    await fs.unlink(fullPath);
  } catch {
    /* non-fatal — orphaned file cleanup is best-effort */
  }
};

// HMAC-signed, time-limited download reference. No public/permanent link —
// same security property the old Supabase signed URL gave us.
// Returns a RELATIVE path; the frontend already prefixes VITE_API_BASE_URL.
export const getSignedDownloadUrl = async (storageKey: string, expiresInSeconds = 300) => {
  const fullPath = resolveWithinUploadDir(storageKey);
  try {
    await fs.access(fullPath);
  } catch {
    throw { statusCode: 404, code: 'FILE_NOT_FOUND', message: 'File not found' };
  }

  const exp = Date.now() + expiresInSeconds * 1000;
  const sig = crypto
    .createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`${storageKey}.${exp}`)
    .digest('hex');

  // Must include the /api/v1 prefix — this route is mounted at
  // /api/v1/files in app.ts, and the earlier version of this returned a
  // path missing that prefix, which caused every "View" click to 404.
  return `/api/v1/files/download/${encodeURIComponent(storageKey)}?exp=${exp}&sig=${sig}`;
};

export const verifyDownloadSignature = (storageKey: string, exp: string, sig: string): boolean => {
  const expNum = Number(exp);
  if (!expNum || Date.now() > expNum) return false;

  const expected = crypto
    .createHmac('sha256', env.JWT_ACCESS_SECRET)
    .update(`${storageKey}.${exp}`)
    .digest('hex');

  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

export const streamFile = (storageKey: string) => resolveWithinUploadDir(storageKey);