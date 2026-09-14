// server/src/jobs/retention-cleanup.job.ts
import fs from "fs/promises";
import path from "path";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { deleteFileFromSupabase } from "../modules/file-storage/fileStorage.service";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Runs nightly via the scheduler. Only deletes rows/files that are already
// expired, used, revoked or superseded — never anything still in use.
export const runRetentionCleanup = async () => {
  const now = Date.now();

  const revokedTokens = await prisma.refreshToken.deleteMany({
    where: { OR: [{ revoked: true }, { expiresAt: { lt: new Date(now) } }] },
  });
  const oldLoginLogs = await prisma.loginLog.deleteMany({
    where: { createdAt: { lt: new Date(now - NINETY_DAYS_MS) } },
  });
  const oldAuditLogs = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: new Date(now - NINETY_DAYS_MS) } },
  });
  const usedResetTokens = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ used: true }, { expiresAt: { lt: new Date(now) } }] },
  });
  const oldNotificationReads = await prisma.notificationRead.deleteMany({
    where: { readAt: { lt: new Date(now - THIRTY_DAYS_MS) } },
  });
  // Notifications shown in the bell/notifications page are auto-deleted
  // after 7 days, per product requirement.
  const oldNotifications = await prisma.notification.deleteMany({
    where: { createdAt: { lt: new Date(now - SEVEN_DAYS_MS) } },
  });

  // Files attached to edit requests that were rejected (or approved and
  // therefore already copied into OnboardingDocument) are dead weight on
  // disk. A full server can take the database down with it, so this is a
  // real availability safeguard, not just tidiness.
  let orphanedRequestFiles = 0;
  const decidedWithFiles = await prisma.fieldChangeRequest.findMany({
    where: { approved: { not: null }, pendingFileStorageKey: { not: null } },
    select: { id: true, pendingFileStorageKey: true },
    take: 500,
  });
  for (const row of decidedWithFiles) {
    const key = row.pendingFileStorageKey as string;
    // eslint-disable-next-line no-await-in-loop
    const stillInUse = await prisma.onboardingDocument.findFirst({
      where: { storageKey: key },
      select: { id: true },
    });
    if (stillInUse) continue;
    // eslint-disable-next-line no-await-in-loop
    await deleteFileFromSupabase(key);
    // eslint-disable-next-line no-await-in-loop
    await prisma.fieldChangeRequest.update({ where: { id: row.id }, data: { pendingFileStorageKey: null } });
    orphanedRequestFiles += 1;
  }

  // Second sweep: anything on disk that no database row references at all
  // (e.g. a crash between writing the file and creating its row).
  let orphanedDiskFiles = 0;
  try {
    const dir = path.resolve(env.UPLOAD_DIR);
    const names = await fs.readdir(dir);
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const stat = await fs.stat(path.join(dir, name)).catch(() => null);
      // Only consider files older than a day, so an in-flight upload is
      // never deleted out from under the request that is creating it.
      if (!stat || !stat.isFile() || now - stat.mtimeMs < 24 * 60 * 60 * 1000) continue;
      // eslint-disable-next-line no-await-in-loop
      const [doc, req] = await Promise.all([
        prisma.onboardingDocument.findFirst({ where: { storageKey: name }, select: { id: true } }),
        prisma.fieldChangeRequest.findFirst({ where: { pendingFileStorageKey: name }, select: { id: true } }),
      ]);
      if (doc || req) continue;
      // eslint-disable-next-line no-await-in-loop
      await deleteFileFromSupabase(name);
      orphanedDiskFiles += 1;
    }
  } catch {
    /* upload directory unreadable — non-fatal, reported as 0 */
  }

  return {
    revokedTokens: revokedTokens.count,
    oldLoginLogs: oldLoginLogs.count,
    oldAuditLogs: oldAuditLogs.count,
    usedResetTokens: usedResetTokens.count,
    oldNotificationReads: oldNotificationReads.count,
    oldNotifications: oldNotifications.count,
    orphanedRequestFiles,
    orphanedDiskFiles,
  };
};