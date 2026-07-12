// src/jobs/file-scan.job.ts
import { prisma } from '../config/db';

// Runs synchronously right after upload instead of via a queued worker.
// ClamAV integration point — file only becomes accessible after a CLEAN result.
export const runFileScan = async (documentId: string) => {
  // TODO: wire actual ClamAV daemon call (e.g. via the `clamscan` npm package) here.
  // Placeholder marks CLEAN so the onboarding flow isn't blocked in dev.
  await prisma.onboardingDocument.update({
    where: { id: documentId },
    data: { scanStatus: 'CLEAN' },
  });
};