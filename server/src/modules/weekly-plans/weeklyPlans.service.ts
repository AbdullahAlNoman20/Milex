// src/modules/weekly-plans/weeklyPlans.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';

export const listPlansForKam = async (kamId: string) =>
  prisma.weeklyPlan.findMany({
    where: { kamId },
    include: { existingVisits: true, prospectVisits: true },
    orderBy: { weekStartDate: 'desc' },
  });

export const listPlansForReview = async () =>
  prisma.weeklyPlan.findMany({
    where: { status: 'SUBMITTED' },
    include: { existingVisits: true, prospectVisits: true },
    orderBy: { createdAt: 'asc' },
  });

export const upsertDraft = async (kamId: string, data: any) => {
  const existing = await prisma.weeklyPlan.findUnique({
    where: { kamId_weekStartDate: { kamId, weekStartDate: data.weekStartDate } },
  });

  if (existing) {
    await prisma.visit.deleteMany({ where: { OR: [{ existingPlanId: existing.id }, { prospectPlanId: existing.id }] } });
    return prisma.weeklyPlan.update({
      where: { id: existing.id },
      data: {
        existingVisits: { create: data.existingVisits },
        prospectVisits: { create: data.prospectVisits },
      },
      include: { existingVisits: true, prospectVisits: true },
    });
  }

  return prisma.weeklyPlan.create({
    data: {
      kamId,
      weekStartDate: data.weekStartDate,
      existingVisits: { create: data.existingVisits },
      prospectVisits: { create: data.prospectVisits },
    },
    include: { existingVisits: true, prospectVisits: true },
  });
};

export const submitPlan = async (kamId: string, weekStartDate: string) => {
  const plan = await prisma.weeklyPlan.findUniqueOrThrow({
    where: { kamId_weekStartDate: { kamId, weekStartDate } },
  });
  return prisma.weeklyPlan.update({
    where: { id: plan.id },
    data: { status: 'SUBMITTED', lmComments: '' },
    include: { existingVisits: true, prospectVisits: true },
  });
};

export const reviewPlan = async (planId: string, approved: boolean, comments: string | undefined, lmId: string) => {
  const before = await prisma.weeklyPlan.findUniqueOrThrow({ where: { id: planId } });
  const updated = await prisma.weeklyPlan.update({
    where: { id: planId },
    data: {
      status: approved ? 'APPROVED' : 'NEEDS_REVISION',
      lmComments: comments?.slice(0, 1000) || '',
    },
    include: { existingVisits: true, prospectVisits: true },
  });
  await logAudit({
    entity: 'WeeklyPlan',
    entityId: planId,
    action: approved ? 'WEEKLY_PLAN_APPROVED' : 'WEEKLY_PLAN_NEEDS_REVISION',
    actorId: lmId,
    beforeState: { status: before.status },
    afterState: { status: updated.status },
  });
  return updated;
};