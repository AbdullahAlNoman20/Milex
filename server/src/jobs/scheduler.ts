// server/src/jobs/scheduler.ts
import cron from "node-cron";
import { logger } from "../app";
import { expireOverdueProvisionalAccounts } from "../modules/onboarding/onboarding.service";
import { runRetentionCleanup } from "./retention-cleanup.job";

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

  logger.info(
    "[cron] Scheduled jobs registered (provisional expiry hourly, retention cleanup daily at 03:00)",
  );
};
