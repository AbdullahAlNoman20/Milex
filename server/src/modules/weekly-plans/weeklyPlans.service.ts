// src/modules/weekly-plans/weeklyPlans.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { emitNotificationToUser } from '../../config/socket';

// Pings the KAM's assigned Line Manager any time a weekly plan is created,
// edited, or submitted — a failure here must never break the actual save.
const notifyLineManagerOfPlanChange = async (kamId: string) => {
  try {
    const kam = await prisma.user.findUnique({ where: { id: kamId }, select: { lineManagerId: true } });
    if (kam?.lineManagerId) emitNotificationToUser(kam.lineManagerId);
  } catch (err) {
    console.warn('[socket] notifyLineManagerOfPlanChange failed (non-fatal):', (err as Error)?.message);
  }
};

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

  let saved;
  if (existing) {
    await prisma.visit.deleteMany({ where: { OR: [{ existingPlanId: existing.id }, { prospectPlanId: existing.id }] } });
    saved = await prisma.weeklyPlan.update({
      where: { id: existing.id },
      data: {
        existingVisits: { create: data.existingVisits },
        prospectVisits: { create: data.prospectVisits },
      },
      include: { existingVisits: true, prospectVisits: true },
    });
  } else {
    saved = await prisma.weeklyPlan.create({
      data: {
        kamId,
        weekStartDate: data.weekStartDate,
        existingVisits: { create: data.existingVisits },
        prospectVisits: { create: data.prospectVisits },
      },
      include: { existingVisits: true, prospectVisits: true },
    });
  }

  await notifyLineManagerOfPlanChange(kamId);
  return saved;
};

export const submitPlan = async (kamId: string, weekStartDate: string) => {
  const plan = await prisma.weeklyPlan.findUniqueOrThrow({
    where: { kamId_weekStartDate: { kamId, weekStartDate } },
  });
  // No approval concept at all anymore — SUBMITTED is just a label for
  // "finalized this session"; the plan stays fully editable afterward.
  const updated = await prisma.weeklyPlan.update({
    where: { id: plan.id },
    data: { status: 'SUBMITTED', lmComments: '' },
    include: { existingVisits: true, prospectVisits: true },
  });
  await notifyLineManagerOfPlanChange(kamId);
  return updated;
};

// Once a weekly plan has been saved, it can no longer be deleted — only
// edited. Deletion is permanently disabled here rather than removing the
// route, so any existing caller gets a clear error instead of a 404.
export const deletePlan = async (id: string, kamId: string) => {
  const plan = await prisma.weeklyPlan.findUnique({ where: { id } });
  if (!plan) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Weekly plan not found' };
  if (plan.kamId !== kamId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have access to this plan' };
  }
  throw { statusCode: 403, code: 'DELETE_NOT_ALLOWED', message: 'Weekly plans cannot be deleted once saved — edit it instead' };
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