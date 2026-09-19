// src/modules/daily-reports/dailyReports.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { notifyLineManagerOfPlanChange } from '../weekly-plans/weeklyPlans.service';

// Mirrors the frontend's Saturday-start work week (see
// admin/.../constants/weeklyPlanStatus.js#getWeekStart), but computed from
// the report's own date rather than "today" so a report for a past/future
// date maps to the correct week. Uses local Date field arithmetic only (no
// toISOString/UTC conversion), so it can't shift the date by a day depending
// on the server's timezone.
const getWeekStartForDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dow = date.getDay(); // 0=Sun ... 6=Sat
  const diff = dow === 6 ? 0 : -(dow + 1);
  date.setDate(date.getDate() + diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getReportByDate = async (kamId: string, date: string) => {
  const existing = await prisma.dailyReport.findUnique({ where: { kamId_date: { kamId, date } }, include: { visits: true } });

  // Always pull the latest Weekly Plan entries for this date, so newly
  // added/edited plan rows keep showing up even after a report already
  // exists for the day (e.g. the KAM adds another planned visit later).
  //
  // This used to load EVERY weekly plan and EVERY visit this KAM had ever
  // created and then filter by day in memory — after a few months that is
  // thousands of rows fetched to find two. The filter now happens in the
  // database, against the new Visit(day) index.
  const scheduled = await prisma.visit.findMany({
    where: {
      day: date,
      OR: [{ existingPlan: { kamId } }, { prospectPlan: { kamId } }],
    },
  });
  const scheduledById = new Map(scheduled.map((v) => [v.id, v]));

  if (existing) {
    // Merge in any scheduled visit not already represented in the saved
    // report (matched by sourceVisitId if the DB tracked it, else by name).
    const existingSourceIds = new Set(existing.visits.map((v: any) => v.sourceVisitId).filter(Boolean));
    const existingNames = new Set(existing.visits.map((v) => v.customerName.trim().toLowerCase()));
    const missing = scheduled.filter(
      (v) => !existingSourceIds.has(v.id) && !existingNames.has(v.customerName.trim().toLowerCase())
    );

    // Keep already-saved rows' customer name / purpose / customerId in sync
    // with their source Weekly Plan visit — otherwise editing the purpose in
    // the Weekly Plan after a daily report already exists for that date
    // never showed up here. Completion status, skip reason, and outcome
    // notes (the KAM's own input for today) are left untouched.
    const syncedExistingVisits = existing.visits.map((v: any) => {
      if (!v.sourceVisitId) return v;
      const source = scheduledById.get(v.sourceVisitId);
      if (!source) return v;
      return {
        ...v,
        customerName: source.customerName,
        customerId: source.customerId || null,
        purpose: source.purpose || '',
      };
    });

    if (missing.length === 0) return { ...existing, visits: syncedExistingVisits };
    return {
      ...existing,
      visits: [
        ...syncedExistingVisits,
        ...missing.map((v) => ({
          id: `plan_${v.id}`,
          customerName: v.customerName,
          customerId: v.customerId || null,
          purpose: v.purpose || '',
          completed: null,
          reasonIfNotCompleted: '',
          outcomeNotes: '',
          sourceVisitId: v.id,
        })),
      ],
    };
  }

  if (scheduled.length === 0) return null;

  return {
    id: null,
    kamId,
    date,
    visits: scheduled.map((v) => ({
      id: `plan_${v.id}`,
      customerName: v.customerName,
      customerId: v.customerId || null,
      purpose: v.purpose || '',
      completed: null,
      reasonIfNotCompleted: '',
      outcomeNotes: '',
      sourceVisitId: v.id,
    })),
  };
};

// No limit by default — Team Reports filters by date across the full history,
// so anything the database holds must be reachable. Callers that only need a
// recent window (the personal activity page) pass one explicitly.
export const listReportsForKam = async (kamId: string, limit?: number) =>
  prisma.dailyReport.findMany({
    where: { kamId },
    include: { visits: true },
    orderBy: { date: 'desc' },
    ...(limit ? { take: limit } : {}),
  });

const cleanVisit = (v: any) => ({
  customerName: v.customerName,
  customerId: v.customerId || null,
  purpose: v.purpose || null,
  completed: v.completed === true || v.completed === false ? v.completed : null,
  reasonIfNotCompleted: v.reasonIfNotCompleted || null,
  outcomeNotes: v.outcomeNotes || null,
  sourceVisitId: v.sourceVisitId || null,
});

export const upsertReport = async (kamId: string, data: { date: string; visits: any[] }) => {

  // A visit added directly on this page (no sourceVisitId — i.e. not already
  // synced from a Weekly Plan) is pushed into that date's Weekly Plan as a
  // prospect visit too, so "Add Visit" here actually shows up in Weekly
  // Sales Planning for that week instead of only living in the daily report.
  // Visits that already carry a sourceVisitId (already synced, or originally
  // scheduled from the plan) are left untouched to avoid duplicates on every
  // re-save.
  const weekStartDate = getWeekStartForDate(data.date);
  const needsSync = data.visits.some((v) => !v.sourceVisitId && v.customerName?.trim());

  // Everything below runs in ONE transaction. Previously the old rows were
  // deleted in one call and recreated in another — if anything failed in
  // between (connection blip, timeout), that day's report was left empty
  // with no way to recover it.
  let wasUpdate = false;

  const report = await prisma.$transaction(
    async (tx) => {
      let visitsForSave = data.visits;

      if (needsSync) {
        const plan = await tx.weeklyPlan.upsert({
          where: { kamId_weekStartDate: { kamId, weekStartDate } },
          update: {},
          create: { kamId, weekStartDate },
        });

        visitsForSave = [];
        for (const v of data.visits) {
          if (v.sourceVisitId || !v.customerName?.trim()) {
            visitsForSave.push(v);
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          const created = await tx.visit.create({
            data: {
              day: data.date,
              customerName: v.customerName,
              customerId: v.customerId || null,
              purpose: v.purpose || '',
              prospectPlanId: plan.id,
            },
          });
          visitsForSave.push({ ...v, sourceVisitId: created.id });
        }
      }

      const cleaned = visitsForSave.map(cleanVisit);
      const existing = await tx.dailyReport.findUnique({ where: { kamId_date: { kamId, date: data.date } } });

      if (existing) {
        wasUpdate = true;
        await tx.reportVisit.deleteMany({ where: { dailyReportId: existing.id } });
        return tx.dailyReport.update({
          where: { id: existing.id },
          data: { visits: { create: cleaned } },
          include: { visits: true },
        });
      }

      return tx.dailyReport.create({
        data: { kamId, date: data.date, visits: { create: cleaned } },
        include: { visits: true },
      });
    },
    { timeout: 20000 }
  );

  // Audit + notification are deliberately off the response path — they must
  // never slow down or fail the save the person just made.
  logAudit({
    entity: 'DailyReport',
    entityId: report.id,
    action: wasUpdate ? 'DAILY_REPORT_UPDATED' : 'DAILY_REPORT_SUBMITTED',
    actorId: kamId,
  }).catch(() => {});
  if (needsSync) notifyLineManagerOfPlanChange(kamId).catch(() => {});

  return report;
};