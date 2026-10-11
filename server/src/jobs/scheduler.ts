// server/src/jobs/scheduler.ts
import cron from "node-cron";
import { logger } from "../app";
import { expireOverdueProvisionalAccounts } from "../modules/onboarding/onboarding.service";
import { runRetentionCleanup } from "./retention-cleanup.job";
import { runDocumentExpiryReminders } from "./document-expiry.job";
import { autoCloseUnreportedVisits } from "./visit-autoclose.job";
import { BUSINESS_TIMEZONE } from "../common/utils/businessDate.util";

// No external queue/infra added — node-cron runs in-process, which is
// sufficient for a single-instance (fork mode) deployment. If this app is
// ever scaled to multiple PM2 workers, move these to one dedicated worker
// or a distributed lock so the jobs don't fire once per worker.
export const startScheduledJobs = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const count = await expireOverdueProvisionalAccounts();
      if (count > 0)
        logger.info(`[cron] Expired ${count} overdue provisional account(s)`);
    } catch (err) {
      logger.error({ err }, "[cron] expireOverdueProvisionalAccounts failed");
    }
  });

  // Five past midnight in Dhaka, not on the server's UTC clock. Late enough
  // that a KAM filing at 11:58pm is safely in; early enough that the day is
  // closed before anyone opens their dashboard in the morning.
  cron.schedule(
    "5 0 * * *",
    async () => {
      try {
        const result = await autoCloseUnreportedVisits();
        if (result.closedExisting + result.closedPlanned > 0) {
          logger.info({ result }, "[cron] closed unreported visits from previous days");
        }
      } catch (err) {
        logger.error({ err }, "[cron] visit auto-close failed");
      }
    },
    { timezone: BUSINESS_TIMEZONE },
  );

  cron.schedule("0 3 * * *", async () => {
    try {
      const result = await runRetentionCleanup();
      logger.info({ result }, "[cron] retention cleanup complete");
    } catch (err) {
      logger.error({ err }, "[cron] retention cleanup failed");
    }
  });

  cron.schedule("0 7 * * *", async () => {
    try {
      const result = await runDocumentExpiryReminders();
      if (result.reminded > 0) logger.info({ result }, "[cron] document expiry reminders sent");
    } catch (err) {
      logger.error({ err }, "[cron] document expiry reminders failed");
    }
  });

  logger.info(
    "[cron] Scheduled jobs registered (visit auto-close 00:05 Dhaka, provisional expiry every 10 min, expiry reminders 07:00, retention cleanup 03:00)",
  );
};