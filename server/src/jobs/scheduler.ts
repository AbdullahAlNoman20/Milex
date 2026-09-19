// server/src/jobs/scheduler.ts
import cron from "node-cron";
import { logger } from "../app";
import { expireOverdueProvisionalAccounts } from "../modules/onboarding/onboarding.service";
import { runRetentionCleanup } from "./retention-cleanup.job";
import { runDocumentExpiryReminders } from "./document-expiry.job";

// No external queue/infra added — node-cron runs in-process, which is
// sufficient for a single-instance (fork mode) deployment. If this app is
// ever scaled to multiple PM2 workers, move these to one dedicated worker
// or a distributed lock so the jobs don't fire once per worker.
export const startScheduledJobs = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const count = await expireOverdueProvisionalAccounts();
      if (count > 0)
        logger.info(`[cron] Expired ${count} overdue provisional account(s)`);
    } catch (err) {
      logger.error({ err }, "[cron] expireOverdueProvisionalAccounts failed");
    }
  });

  cron.schedule("0 3 * * *", async () => {
    try {
      const result = await runRetentionCleanup();
      logger.info({ result }, "[cron] retention cleanup complete");
    } catch (err) {
      logger.error({ err }, "[cron] retention cleanup failed");
    }
  });

  // Early morning, before the working day, so a licence about to lapse is
  // already sitting in the KAM's notifications when they sign in.
  cron.schedule("0 7 * * *", async () => {
    try {
      const result = await runDocumentExpiryReminders();
      if (result.reminded > 0) logger.info({ result }, "[cron] document expiry reminders sent");
    } catch (err) {
      logger.error({ err }, "[cron] document expiry reminders failed");
    }
  });

  logger.info(
    "[cron] Scheduled jobs registered (provisional expiry hourly, expiry reminders 07:00, retention cleanup 03:00)",
  );
};
