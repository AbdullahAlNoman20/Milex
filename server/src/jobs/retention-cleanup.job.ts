// server/src/jobs/retention-cleanup.job.ts
import { prisma } from "../config/db";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// Not wired to a scheduler (no cron/queue infra in this project yet) — call
// manually or hook into a cron job when one is added. Only deletes rows that
// are already expired/used/revoked, so it changes nothing functional.
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

  return {
    revokedTokens: revokedTokens.count,
    oldLoginLogs: oldLoginLogs.count,
    oldAuditLogs: oldAuditLogs.count,
    usedResetTokens: usedResetTokens.count,
    oldNotificationReads: oldNotificationReads.count,
  };
};
