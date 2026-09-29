// server/src/modules/weekly-plans/weeklyPlans.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { createNotificationsForUsers } from '../notifications/notifications.service';
import { businessToday } from '../../common/utils/businessDate.util';

// Notifies the KAM's assigned Line Manager any time a weekly plan is
// created, edited, or submitted — a failure here must never break the
// actual save.
export const notifyLineManagerOfPlanChange = async (kamId: string, label?: string) => {
  try {
    const kam = await prisma.user.findUnique({ where: { id: kamId }, select: { lineManagerId: true, name: true } });
    if (kam?.lineManagerId) {
      await createNotificationsForUsers([kam.lineManagerId], {
        label: label || `${kam.name} updated their weekly plan`,
        link: '/app/team-reports',
      });
    }
  } catch (err) {
    console.warn('[notifications] notifyLineManagerOfPlanChange failed (non-fatal):', (err as Error)?.message);
  }
};

// Taking a planned visit off the week is the one change to a plan that
// destroys something rather than adding to it, so both the Line Manager and
// the Head of Department are told — not only the manager directly above.
const notifyPlanVisitsRemoved = async (kamId: string, removedCount: number) => {
  try {
    const [kam, hods] = await Promise.all([
      prisma.user.findUnique({ where: { id: kamId }, select: { lineManagerId: true, name: true } }),
      prisma.user.findMany({
        where: { role: { name: 'HEAD_OF_DEPARTMENT' }, isActive: true },
        select: { id: true },
      }),
    ]);
    const recipients = [...new Set([
      ...(kam?.lineManagerId ? [kam.lineManagerId] : []),
      ...hods.map((h) => h.id),
    ])];
    if (recipients.length === 0) return;
    await createNotificationsForUsers(recipients, {
      label: `${kam?.name || 'A Key Account Manager'} removed ${removedCount} planned visit${removedCount === 1 ? '' : 's'} from their weekly plan`,
      link: '/app/team-reports',
    });
  } catch (err) {
    console.warn('[notifications] notifyPlanVisitsRemoved failed (non-fatal):', (err as Error)?.message);
  }
};

// Every list of visits comes back in date order, earliest first, so the week
// reads the way it will be lived rather than in the order rows were typed.
const VISIT_ORDER: { orderBy: Prisma.VisitOrderByWithRelationInput[] } = {
  orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
};
const PLAN_VISITS = { existingVisits: VISIT_ORDER, prospectVisits: VISIT_ORDER } as const;

// Weekly Plan visits carry no completion/outcome data of their own — that
// only exists once a KAM logs the corresponding Daily Visiting Report entry
// (linked back via ReportVisit.sourceVisitId). This merges that real outcome
// onto each visit so every view shows what actually happened.
const attachVisitOutcomes = async <T extends { existingVisits: any[]; prospectVisits: any[] }>(
  plans: T[]
): Promise<T[]> => {
  const visitIds = plans.flatMap((p) => [...p.existingVisits, ...p.prospectVisits].map((v) => v.id));
  if (visitIds.length === 0) return plans;

  const reportVisits = await prisma.reportVisit.findMany({
    where: { sourceVisitId: { in: visitIds } },
    select: {
      sourceVisitId: true,
      completed: true,
      outcomeNotes: true,
      reasonIfNotCompleted: true,
      autoClosedAt: true,
    },
  });
  // Where a visit has more than one report line, the one with an actual
  // answer wins — an undecided duplicate must never mask a decided one and
  // make a completed visit look as though it is still waiting.
  const bySourceId = new Map<string, (typeof reportVisits)[number]>();
  for (const rv of reportVisits) {
    const key = rv.sourceVisitId as string;
    const prior = bySourceId.get(key);
    if (!prior || (prior.completed === null && rv.completed !== null)) bySourceId.set(key, rv);
  }

  const mapVisit = (v: any) => {
    const rv = bySourceId.get(v.id);
    return {
      ...v,
      completed: rv ? rv.completed : null,
      outcomeNotes: rv?.outcomeNotes || null,
      reasonIfNotCompleted: rv?.reasonIfNotCompleted || null,
      autoClosed: !!rv?.autoClosedAt,
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
    include: PLAN_VISITS,
    orderBy: { weekStartDate: 'desc' },
  });
  return attachVisitOutcomes(plans);
};

export const listPlansForReview = async () => {
  const plans = await prisma.weeklyPlan.findMany({
    where: { status: 'SUBMITTED' },
    include: PLAN_VISITS,
    orderBy: { createdAt: 'asc' },
  });
  return attachVisitOutcomes(plans);
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rows are diffed (update / create / delete) instead of wiped and recreated,
// so every visit keeps its id for life and ReportVisit.sourceVisitId keeps
// resolving. The whole diff runs in one transaction, and every check runs
// before anything is written, so a refused save changes nothing at all.
export const upsertDraft = async (kamId: string, data: any) => {
  let removedCount = 0;
  const today = businessToday();

  const saved = await prisma.$transaction(
    async (tx) => {
      const plan = await tx.weeklyPlan.upsert({
        where: { kamId_weekStartDate: { kamId, weekStartDate: data.weekStartDate } },
        update: {},
        create: { kamId, weekStartDate: data.weekStartDate },
      });

      const incoming = [
        ...(data.existingVisits || []).map((v: any) => ({ v, section: 'existing' as const })),
        ...(data.prospectVisits || []).map((v: any) => ({ v, section: 'prospect' as const })),
      ];

      const current = await tx.visit.findMany({
        where: { OR: [{ existingPlanId: plan.id }, { prospectPlanId: plan.id }] },
        select: { id: true, createdAt: true, day: true },
      });
      const currentIds = new Set(current.map((r) => r.id));
      const currentDayById = new Map(current.map((r) => [r.id, r.day]));

      // A visit already answered — completed, skipped, or closed overnight —
      // is a record of what happened, not a plan. It is left exactly as it
      // is, whatever the page sends.
      const reported = await tx.reportVisit.findMany({
        where: { sourceVisitId: { in: [...currentIds] }, NOT: { completed: null } },
        select: { sourceVisitId: true },
      });
      const lockedIds = new Set(reported.map((r) => r.sourceVisitId as string));

      const keepIds = new Set<string>(
        incoming
          .map(({ v }) => v.id)
          .filter((id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id) && currentIds.has(id))
      );

      const toUpdate: { id: string; fields: any }[] = [];
      const toCreate: any[] = [];

      for (const { v } of incoming) {
        if (typeof v.id === 'string' && lockedIds.has(v.id)) continue;

        const isSavedRow = typeof v.id === 'string' && keepIds.has(v.id);
        const customerName = typeof v.customerName === 'string' ? v.customerName.trim() : '';
        const purpose = typeof v.purpose === 'string' ? v.purpose.trim() : '';
        const customerId = v.customerId || null;

        // Visits are planned from today onwards. A saved visit whose date has
        // since passed is untouched by this — only a new one, or one moved to
        // a different day, has to land today or later.
        const dayChanged = !isSavedRow || currentDayById.get(v.id) !== v.day;
        if (dayChanged && v.day < today) {
          throw {
            statusCode: 400,
            code: 'VISIT_DATE_PASSED',
            message: `${customerName || 'A visit'} is dated ${v.day}, which has already passed. Visits can only be planned from today (${today}) onwards.`,
          };
        }
        if (!isSavedRow && !purpose) {
          throw {
            statusCode: 400,
            code: 'PURPOSE_REQUIRED',
            message: `Please describe the purpose of the visit to ${customerName || 'this customer'}.`,
          };
        }

        // The two lists are defined by the customer record, not by the tab
        // the visit was typed into. Existing Clients holds only customers the
        // system actually knows; any other name is a prospect, even when it
        // was entered on the existing tab.
        const targetSection = customerId ? 'existing' : 'prospect';

        const fields = {
          day: v.day,
          customerName,
          customerId,
          purpose,
          outcomeNotes: v.outcomeNotes ?? null,
          existingPlanId: targetSection === 'existing' ? plan.id : null,
          prospectPlanId: targetSection === 'prospect' ? plan.id : null,
        };
        if (isSavedRow) toUpdate.push({ id: v.id, fields });
        else toCreate.push(fields);
      }

      // Only rows the person could actually have seen are treated as
      // deliberate removals. Anything created after their page was loaded —
      // from the Daily Report, or another tab — is kept.
      const knownSince: Date | null = data.loadedAt ? new Date(data.loadedAt) : null;
      const removable: string[] = knownSince
        ? current.filter((r) => r.createdAt.getTime() <= knownSince.getTime()).map((r) => r.id)
        : [];
      const removedIds = removable.filter((id) => !keepIds.has(id) && !lockedIds.has(id));

      if (removedIds.length > 0) {
        await tx.visit.deleteMany({ where: { id: { in: removedIds } } });
      }
      removedCount = removedIds.length;

      if (toCreate.length > 0) {
        await tx.visit.createMany({ data: toCreate });
      }
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map((u) => tx.visit.update({ where: { id: u.id }, data: u.fields })));
      }

      return tx.weeklyPlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: PLAN_VISITS,
      });
    },
    { timeout: 20000 }
  );

  if (removedCount > 0) notifyPlanVisitsRemoved(kamId, removedCount).catch(() => {});
  else notifyLineManagerOfPlanChange(kamId).catch(() => {});
  const [withOutcomes] = await attachVisitOutcomes([saved]);
  return withOutcomes;
};

export const submitPlan = async (kamId: string, weekStartDate: string) => {
  const plan = await prisma.weeklyPlan.findUniqueOrThrow({
    where: { kamId_weekStartDate: { kamId, weekStartDate } },
  });
  const updated = await prisma.weeklyPlan.update({
    where: { id: plan.id },
    data: { status: 'SUBMITTED', lmComments: '' },
    include: PLAN_VISITS,
  });
  notifyLineManagerOfPlanChange(kamId).catch(() => {});
  const [withOutcomes] = await attachVisitOutcomes([updated]);
  return withOutcomes;
};

// Once a weekly plan has been saved, it can no longer be deleted — only
// edited.
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
    include: PLAN_VISITS,
  });
  await logAudit({
    entity: 'WeeklyPlan',
    entityId: planId,
    action: approved ? 'WEEKLY_PLAN_APPROVED' : 'WEEKLY_PLAN_NEEDS_REVISION',
    actorId: lmId,
    beforeState: { status: before.status },
    afterState: { status: updated.status },
  });
  await createNotificationsForUsers([updated.kamId], {
    label: approved
      ? `Your weekly plan for week of ${updated.weekStartDate} was approved`
      : `Your weekly plan for week of ${updated.weekStartDate} needs revision`,
    link: '/app/weekly-plans',
  });
  const [withOutcomes] = await attachVisitOutcomes([updated]);
  return withOutcomes;
};