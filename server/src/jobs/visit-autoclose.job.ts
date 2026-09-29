// server/src/jobs/visit-autoclose.job.ts
import { prisma } from '../config/db';
import { businessToday } from '../common/utils/businessDate.util';

// A day's visits are answered on that day. Left open, a plan fills up with
// visits that are neither done nor skipped, and the completion figures stop
// meaning anything — a KAM who never reports looks the same as one with
// nothing to report.
//
// So once the day has turned, every visit from an earlier day that nobody
// answered is closed as "not updated". It is recorded as a real outcome and
// cannot be changed afterwards: answering for a day that has gone is not
// reporting, it is rewriting.
export const AUTO_CLOSE_REASON = 'Not updated by the end of the day';

type PendingVisit = {
  id: string;
  day: string;
  customerName: string;
  customerId: string | null;
  purpose: string | null;
  kamId: string | null;
};

export const autoCloseUnreportedVisits = async () => {
  const cutoff = businessToday();
  const now = new Date();

  // Lines already on a report but never answered.
  const closedExisting = await prisma.reportVisit.updateMany({
    where: { completed: null, autoClosedAt: null, dailyReport: { date: { lt: cutoff } } },
    data: { completed: false, reasonIfNotCompleted: AUTO_CLOSE_REASON, autoClosedAt: now },
  });

  // Planned visits that never made it onto a report at all. Found in the
  // database rather than by loading every visit ever planned, and the
  // NOT EXISTS makes a second run on the same night a no-op.
  const pending = await prisma.$queryRaw<PendingVisit[]>`
    SELECT v.id, v.day, v."customerName", v."customerId", v.purpose,
           COALESCE(ep."kamId", pp."kamId") AS "kamId"
    FROM "Visit" v
    LEFT JOIN "WeeklyPlan" ep ON ep.id = v."existingPlanId"
    LEFT JOIN "WeeklyPlan" pp ON pp.id = v."prospectPlanId"
    WHERE v.day < ${cutoff}
      AND NOT EXISTS (SELECT 1 FROM "ReportVisit" r WHERE r."sourceVisitId" = v.id)
  `;

  const byKamAndDay = new Map<string, PendingVisit[]>();
  for (const v of pending) {
    if (!v.kamId) continue;
    const key = `${v.kamId}|${v.day}`;
    const bucket = byKamAndDay.get(key);
    if (bucket) bucket.push(v);
    else byKamAndDay.set(key, [v]);
  }

  let closedPlanned = 0;
  for (const [key, visits] of byKamAndDay) {
    const [kamId, day] = key.split('|');
    try {
      // eslint-disable-next-line no-await-in-loop
      await prisma.$transaction(async (tx) => {
        const report = await tx.dailyReport.upsert({
          where: { kamId_date: { kamId, date: day } },
          update: {},
          create: { kamId, date: day },
          select: { id: true },
        });
        await tx.reportVisit.createMany({
          data: visits.map((v) => ({
            dailyReportId: report.id,
            sourceVisitId: v.id,
            customerId: v.customerId,
            customerName: v.customerName,
            purpose: v.purpose || '',
            completed: false,
            reasonIfNotCompleted: AUTO_CLOSE_REASON,
            autoClosedAt: now,
          })),
        });
      });
      closedPlanned += visits.length;
    } catch (err) {
      // One KAM's day failing must not stop the rest of the sweep.
      console.warn(`[cron] visit auto-close failed for ${kamId} on ${day}:`, (err as Error)?.message);
    }
  }

  return { closedExisting: closedExisting.count, closedPlanned };
};