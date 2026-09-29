// server/src/modules/daily-reports/dailyReports.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { notifyLineManagerOfPlanChange } from '../weekly-plans/weeklyPlans.service';

// Mirrors the frontend's Saturday-start work week, computed from the report's
// own date with local field arithmetic only, so it cannot shift by a day
// depending on the server's timezone.
const getWeekStartForDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dow = date.getDay();
  const diff = dow === 6 ? 0 : -(dow + 1);
  date.setDate(date.getDate() + diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getReportByDate = async (kamId: string, date: string) => {
  const existing = await prisma.dailyReport.findUnique({ where: { kamId_date: { kamId, date } }, include: { visits: true } });

  const scheduled = await prisma.visit.findMany({
    where: {
      day: date,
      OR: [{ existingPlan: { kamId } }, { prospectPlan: { kamId } }],
    },
    orderBy: { createdAt: 'asc' },
  });
  const scheduledById = new Map(scheduled.map((v) => [v.id, v]));

  if (existing) {
    const existingSourceIds = new Set(existing.visits.map((v: any) => v.sourceVisitId).filter(Boolean));
    const existingNames = new Set(existing.visits.map((v) => v.customerName.trim().toLowerCase()));
    const missing = scheduled.filter(
      (v) => !existingSourceIds.has(v.id) && !existingNames.has(v.customerName.trim().toLowerCase())
    );

    // Keep saved rows' name / purpose / customerId in step with their source
    // plan visit. The KAM's own answer for the day is never touched.
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
          autoClosedAt: null,
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
      autoClosedAt: null,
    })),
  };
};

export const listReportsForKam = async (kamId: string, limit?: number) =>
  prisma.dailyReport.findMany({
    where: { kamId },
    include: { visits: true },
    orderBy: { date: 'desc' },
    ...(limit ? { take: limit } : {}),
  });

const cleanVisit = (v: any) => ({
  customerName: typeof v.customerName === 'string' ? v.customerName.trim() : '',
  customerId: v.customerId || null,
  purpose: v.purpose || null,
  completed: v.completed === true || v.completed === false ? v.completed : null,
  reasonIfNotCompleted: v.reasonIfNotCompleted || null,
  outcomeNotes: v.outcomeNotes || null,
  sourceVisitId: v.sourceVisitId || null,
});

export const upsertReport = async (kamId: string, data: { date: string; visits: any[] }) => {
  const weekStartDate = getWeekStartForDate(data.date);
  let wasUpdate = false;
  let addedToPlan = false;

  const report = await prisma.$transaction(
    async (tx) => {
      const existing = await tx.dailyReport.findUnique({ where: { kamId_date: { kamId, date: data.date } } });

      // Lines the nightly sweep closed are the one thing a save never
      // touches. This used to delete and recreate every line on the day, so
      // an overnight "not updated" would have been wiped the next time
      // anything on that date was saved.
      const closed = existing
        ? await tx.reportVisit.findMany({
            where: { dailyReportId: existing.id, NOT: { autoClosedAt: null } },
            select: { id: true, sourceVisitId: true },
          })
        : [];
      const closedIds = new Set(closed.map((r) => r.id));
      const closedSourceIds = new Set(closed.map((r) => r.sourceVisitId).filter((id): id is string => !!id));

      const open = (data.visits || []).filter(
        (v) =>
          !(typeof v.id === 'string' && closedIds.has(v.id)) &&
          !(v.sourceVisitId && closedSourceIds.has(v.sourceVisitId))
      );

      // A visit added directly on this page goes into that week's plan as
      // well — as an existing-client visit when it names a customer on the
      // books, as a prospect otherwise.
      let visitsForSave = open;
      const needsSync = open.some((v) => !v.sourceVisitId && v.customerName?.trim());
      if (needsSync) {
        addedToPlan = true;
        const plan = await tx.weeklyPlan.upsert({
          where: { kamId_weekStartDate: { kamId, weekStartDate } },
          update: {},
          create: { kamId, weekStartDate },
        });

        visitsForSave = [];
        for (const v of open) {
          if (v.sourceVisitId || !v.customerName?.trim()) {
            visitsForSave.push(v);
            continue;
          }
          // eslint-disable-next-line no-await-in-loop
          const created = await tx.visit.create({
            data: {
              day: data.date,
              customerName: v.customerName.trim(),
              customerId: v.customerId || null,
              purpose: v.purpose || '',
              ...(v.customerId ? { existingPlanId: plan.id } : { prospectPlanId: plan.id }),
            },
          });
          visitsForSave.push({ ...v, sourceVisitId: created.id });
        }
      }

      const cleaned = visitsForSave.map(cleanVisit);

      if (existing) {
        wasUpdate = true;
        await tx.reportVisit.deleteMany({ where: { dailyReportId: existing.id, autoClosedAt: null } });
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

  logAudit({
    entity: 'DailyReport',
    entityId: report.id,
    action: wasUpdate ? 'DAILY_REPORT_UPDATED' : 'DAILY_REPORT_SUBMITTED',
    actorId: kamId,
  }).catch(() => {});
  if (addedToPlan) notifyLineManagerOfPlanChange(kamId).catch(() => {});

  return report;
};