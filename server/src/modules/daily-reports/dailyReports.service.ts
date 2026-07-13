// src/modules/daily-reports/dailyReports.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';

export const getReportByDate = async (kamId: string, date: string) =>
  prisma.dailyReport.findUnique({ where: { kamId_date: { kamId, date } }, include: { visits: true } });

export const listReportsForKam = async (kamId: string) =>
  prisma.dailyReport.findMany({
    where: { kamId },
    include: { visits: true },
    orderBy: { date: 'desc' },
    take: 60,
  });

export const upsertReport = async (kamId: string, data: { date: string; visits: any[] }) => {
  const existing = await prisma.dailyReport.findUnique({ where: { kamId_date: { kamId, date: data.date } } });

  if (existing) {
    await prisma.reportVisit.deleteMany({ where: { dailyReportId: existing.id } });
    const updated = await prisma.dailyReport.update({
      where: { id: existing.id },
      data: { visits: { create: data.visits } },
      include: { visits: true },
    });
    await logAudit({ entity: 'DailyReport', entityId: updated.id, action: 'DAILY_REPORT_UPDATED', actorId: kamId });
    return updated;
  }

  const created = await prisma.dailyReport.create({
    data: { kamId, date: data.date, visits: { create: data.visits } },
    include: { visits: true },
  });
  await logAudit({ entity: 'DailyReport', entityId: created.id, action: 'DAILY_REPORT_SUBMITTED', actorId: kamId });
  return created;
};