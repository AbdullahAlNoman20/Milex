// src/modules/daily-reports/dailyReports.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';

export const getReportByDate = async (kamId: string, date: string) => {
  const existing = await prisma.dailyReport.findUnique({ where: { kamId_date: { kamId, date } }, include: { visits: true } });

  // Always pull the latest Weekly Plan entries for this date, so newly
  // added/edited plan rows keep showing up even after a report already
  // exists for the day (e.g. the KAM adds another planned visit later).
  const plans = await prisma.weeklyPlan.findMany({
    where: { kamId },
    include: { existingVisits: true, prospectVisits: true },
  });
  const scheduled = plans.flatMap((p) => [...p.existingVisits, ...p.prospectVisits]).filter((v) => v.day === date);

  if (existing) {
    // Merge in any scheduled visit not already represented in the saved
    // report (matched by sourceVisitId if the DB tracked it, else by name).
    const existingSourceIds = new Set(existing.visits.map((v: any) => v.sourceVisitId).filter(Boolean));
    const existingNames = new Set(existing.visits.map((v) => v.customerName.trim().toLowerCase()));
    const missing = scheduled.filter(
      (v) => !existingSourceIds.has(v.id) && !existingNames.has(v.customerName.trim().toLowerCase())
    );
    if (missing.length === 0) return existing;
    return {
      ...existing,
      visits: [
        ...existing.visits,
        ...missing.map((v) => ({
          id: `plan_${v.id}`,
          customerName: v.customerName,
          completed: true,
          reasonIfNotCompleted: '',
          outcomeNotes: v.purpose || '',
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
      completed: true,
      reasonIfNotCompleted: '',
      outcomeNotes: v.purpose || '',
      sourceVisitId: v.id,
    })),
  };
};

export const listReportsForKam = async (kamId: string) =>
  prisma.dailyReport.findMany({
    where: { kamId },
    include: { visits: true },
    orderBy: { date: 'desc' },
    take: 60,
  });

const cleanVisit = (v: any) => ({
  customerName: v.customerName,
  completed: v.completed,
  reasonIfNotCompleted: v.reasonIfNotCompleted || null,
  outcomeNotes: v.outcomeNotes || null,
  sourceVisitId: v.sourceVisitId || null,
});

export const upsertReport = async (kamId: string, data: { date: string; visits: any[] }) => {
  const existing = await prisma.dailyReport.findUnique({ where: { kamId_date: { kamId, date: data.date } } });

  const cleaned = data.visits.map(cleanVisit);

  if (existing) {
    await prisma.reportVisit.deleteMany({ where: { dailyReportId: existing.id } });
    const updated = await prisma.dailyReport.update({
      where: { id: existing.id },
      data: { visits: { create: cleaned } },
      include: { visits: true },
    });
    await logAudit({ entity: 'DailyReport', entityId: updated.id, action: 'DAILY_REPORT_UPDATED', actorId: kamId });
    return updated;
  }

  const created = await prisma.dailyReport.create({
    data: { kamId, date: data.date, visits: { create: cleaned } },
    include: { visits: true },
  });
  await logAudit({ entity: 'DailyReport', entityId: created.id, action: 'DAILY_REPORT_SUBMITTED', actorId: kamId });
  return created;
};