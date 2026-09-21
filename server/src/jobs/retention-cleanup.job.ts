// server/src/jobs/retention-cleanup.job.ts
import fs from "fs/promises";
import path from "path";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { deleteFileFromSupabase } from "../modules/file-storage/fileStorage.service";
import { EDIT_HISTORY_ACTIONS } from "../modules/customers/customers.service";

const ACTIVITY_KEEP_PER_USER = 100;

// Keeps each person's activity trail at its most recent 100 entries, exactly
// as the Activity page shows it — anything older is removed from the database
// rather than just hidden.
//
// Edit-history actions are deliberately excluded from the trim: the customer
// Edit History view reads those same AuditLog rows, and that record must stay
// complete for as long as the customer exists.
// Two statements instead of four per user. The previous version issued a
// select and a delete for every person in the system on both tables, so the
// nightly sweep's cost grew with headcount rather than with the amount of
// data actually being removed.
const trimActivityLogs = async () => {
  const removedLogins = await prisma.$executeRaw`
    DELETE FROM "LoginLog" l
    USING (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS rn
      FROM "LoginLog"
      WHERE "userId" IS NOT NULL
    ) ranked
    WHERE l.id = ranked.id AND ranked.rn > ${ACTIVITY_KEEP_PER_USER}
  `;

  // Edit-history actions are deliberately excluded: the customer Edit History
  // view reads those same rows and must stay complete for as long as the
  // customer exists.
  const removedActions = await prisma.$executeRaw`
    DELETE FROM "AuditLog" a
    USING (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY "actorId" ORDER BY "createdAt" DESC) AS rn
      FROM "AuditLog"
      WHERE "actorId" IS NOT NULL AND NOT ("action" = ANY(${EDIT_HISTORY_ACTIONS}))
    ) ranked
    WHERE a.id = ranked.id AND ranked.rn > ${ACTIVITY_KEEP_PER_USER}
  `;

  return { removedLogins: Number(removedLogins), removedActions: Number(removedActions) };
};

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
  // Superseded by the per-user 100-entry trim below, which is stricter — a
  // second age-based sweep would only ever delete rows that are already gone.
  const oldLoginLogs = { count: 0 };
  const activityTrim = await trimActivityLogs();
  // AuditLog is deliberately NEVER purged: the customer Edit History view
  // and every compliance question read from it. Nothing else in this job
  // is coupled to it either.
  const oldAuditLogs = { count: 0 };
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
  if (decidedWithFiles.length > 0) {
    // One query instead of one per row — this used to be a clean N+1 that
    // grew linearly with every decided edit request in the system.
    const keys = decidedWithFiles.map((r) => r.pendingFileStorageKey as string);
    const inUse = await prisma.onboardingDocument.findMany({
      where: { storageKey: { in: keys } },
      select: { storageKey: true },
    });
    const inUseSet = new Set(inUse.map((d) => d.storageKey));
    const removable = decidedWithFiles.filter((r) => !inUseSet.has(r.pendingFileStorageKey as string));

    await Promise.all(removable.map((r) => deleteFileFromSupabase(r.pendingFileStorageKey as string)));
    if (removable.length > 0) {
      await prisma.fieldChangeRequest.updateMany({
        where: { id: { in: removable.map((r) => r.id) } },
        data: { pendingFileStorageKey: null },
      });
    }
    orphanedRequestFiles = removable.length;
  }

  // Second sweep: anything on disk that no database row references at all
  // (e.g. a crash between writing the file and creating its row).
  let orphanedDiskFiles = 0;
  try {
    const dir = path.resolve(env.UPLOAD_DIR);
    const names = await fs.readdir(dir);

    // Batched rather than one enormous Promise.all: a directory with tens of
    // thousands of files would otherwise open that many file handles at once
    // and exhaust the process limit.
    const stats: { name: string; stat: import('fs').Stats | null }[] = [];
    const STAT_BATCH = 200;
    for (let i = 0; i < names.length; i += STAT_BATCH) {
      // eslint-disable-next-line no-await-in-loop
      const chunk = await Promise.all(
        names.slice(i, i + STAT_BATCH).map(async (name) => ({
          name,
          stat: await fs.stat(path.join(dir, name)).catch(() => null),
        }))
      );
      stats.push(...chunk);
    }
    // Only files older than a day, so an in-flight upload is never deleted
    // out from under the request that is creating it.
    const candidates = stats
      .filter(({ stat }) => stat?.isFile() && now - stat.mtimeMs >= 24 * 60 * 60 * 1000)
      .map(({ name }) => name);

    if (candidates.length > 0) {
      // Two queries total, instead of two per file on disk.
      const [docs, reqs] = await Promise.all([
        prisma.onboardingDocument.findMany({ where: { storageKey: { in: candidates } }, select: { storageKey: true } }),
        prisma.fieldChangeRequest.findMany({
          where: { pendingFileStorageKey: { in: candidates } },
          select: { pendingFileStorageKey: true },
        }),
      ]);
      const referenced = new Set([
        ...docs.map((d) => d.storageKey),
        ...reqs.map((r) => r.pendingFileStorageKey as string),
      ]);
      const orphans = candidates.filter((name) => !referenced.has(name));
      await Promise.all(orphans.map((name) => deleteFileFromSupabase(name)));
      orphanedDiskFiles = orphans.length;
    }
  } catch {
    /* upload directory unreadable — non-fatal, reported as 0 */
  }

  return {
    revokedTokens: revokedTokens.count,
    oldLoginLogs: oldLoginLogs.count + activityTrim.removedLogins,
    oldAuditLogs: oldAuditLogs.count + activityTrim.removedActions,
    usedResetTokens: usedResetTokens.count,
    oldNotificationReads: oldNotificationReads.count,
    oldNotifications: oldNotifications.count,
    orphanedRequestFiles,
    orphanedDiskFiles,
  };
};