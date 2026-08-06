// server/src/modules/weekly-plans/weeklyPlans.service.ts — REPLACE ENTIRE FILE
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

// Weekly Plan visits carry no completion/outcome data of their own — that
// only exists once a KAM logs the corresponding Daily Visiting Report entry
// (linked back via ReportVisit.sourceVisitId). This merges that real
// completed/outcomeNotes/reasonIfNotCompleted data onto each visit so both
// the KAM's own Weekly Plan view and the Line Manager's Team Reports view
// (which reuses listPlansForKam via the /kam/:kamId route) show actual
// visit outcomes instead of always appearing blank/Planned.
const attachVisitOutcomes = async <T extends { existingVisits: any[]; prospectVisits: any[] }>(
  plans: T[]
): Promise<T[]> => {
  const visitIds = plans.flatMap((p) => [...p.existingVisits, ...p.prospectVisits].map((v) => v.id));
  if (visitIds.length === 0) return plans;

  const reportVisits = await prisma.reportVisit.findMany({ where: { sourceVisitId: { in: visitIds } } });
  const bySourceId = new Map(reportVisits.map((rv) => [rv.sourceVisitId as string, rv]));

  const mapVisit = (v: any) => {
    const rv = bySourceId.get(v.id);
    return {
      ...v,
      completed: rv ? rv.completed : null,
      outcomeNotes: rv?.outcomeNotes || null,
      reasonIfNotCompleted: rv?.reasonIfNotCompleted || null,
    };
  };

  return plans.map((p) => ({
    ...p,
    existingVisits: p.existingVisits.map(mapVisit),
    prospectVisits: p.prospectVisits.map(mapVisit),
  }));
};

export const listPlansForKam = async (kamId: string) => {
  const plans = await prisma.weeklyPlan.findMany({
    where: { kamId },
    include: { existingVisits: true, prospectVisits: true },
    orderBy: { weekStartDate: 'desc' },
  });
  return attachVisitOutcomes(plans);
};

export const listPlansForReview = async () => {
  const plans = await prisma.weeklyPlan.findMany({
    where: { status: 'SUBMITTED' },
    include: { existingVisits: true, prospectVisits: true },
    orderBy: { createdAt: 'asc' },
  });
  return attachVisitOutcomes(plans);
};

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
  const [withOutcomes] = await attachVisitOutcomes([saved]);
  return withOutcomes;
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
  const [withOutcomes] = await attachVisitOutcomes([updated]);
  return withOutcomes;
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
  const [withOutcomes] = await attachVisitOutcomes([updated]);
  return withOutcomes;
};