// server/src/modules/weekly-plans/weeklyPlans.service.ts — REPLACE ENTIRE FILE
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { createNotificationsForUsers } from '../notifications/notifications.service';

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rows are now diffed (update / create / delete) instead of wiped and
// recreated, so every visit keeps its id for life. That is what makes
// ReportVisit.sourceVisitId keep resolving, which is what makes Daily
// Report outcomes keep showing in the Weekly Plan and Team Reports views.
// The whole diff runs in one transaction: a failure half way through can
// no longer leave the week's plan partially or fully wiped.
export const upsertDraft = async (kamId: string, data: any) => {
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
        select: { id: true, createdAt: true },
      });
      const currentIds = new Set(current.map((r) => r.id));

      const keepIds = new Set<string>(
        incoming
          .map(({ v }) => v.id)
          .filter((id: unknown): id is string => typeof id === 'string' && UUID_RE.test(id) && currentIds.has(id))
      );

      // A visit missing from the incoming list is not necessarily one the
      // person deleted — it may have been added since their page was loaded,
      // from the Daily Report or from another tab, in which case removing it
      // would silently destroy work they never saw. Rows created after the
      // page was fetched are therefore kept, and only rows the person could
      // actually have seen are treated as deliberate removals.
      // Without a freshness marker there is no way to tell a deliberate
      // removal from a row that arrived after the page was loaded, so the
      // safe reading is that nothing was deliberately removed. A visit the
      // person really did delete can always be deleted again; one destroyed
      // by a stale save cannot be recovered.
      const knownSince: Date | null = data.loadedAt ? new Date(data.loadedAt) : null;
      const removable: string[] = knownSince
        ? current.filter((r) => r.createdAt.getTime() <= knownSince.getTime()).map((r) => r.id)
        : [];

      const removedIds = removable.filter((id) => !keepIds.has(id));
      if (removedIds.length > 0) {
        await tx.visit.deleteMany({ where: { id: { in: removedIds } } });
      }

      const toUpdate: { id: string; fields: any }[] = [];
      const toCreate: any[] = [];

      for (const { v, section } of incoming) {
        const fields = {
          day: v.day,
          customerName: v.customerName,
          customerId: v.customerId || null,
          purpose: v.purpose,
          outcomeNotes: v.outcomeNotes ?? null,
          existingPlanId: section === 'existing' ? plan.id : null,
          prospectPlanId: section === 'prospect' ? plan.id : null,
        };
        if (typeof v.id === 'string' && keepIds.has(v.id)) toUpdate.push({ id: v.id, fields });
        else toCreate.push(fields);
      }

      // New rows go in one statement; updates are issued together instead of
      // strictly one-after-another. A busy week used to fire dozens of
      // sequential round trips inside the transaction and could hit the
      // 20-second timeout with the plan half-written.
      if (toCreate.length > 0) {
        await tx.visit.createMany({ data: toCreate });
      }
      if (toUpdate.length > 0) {
        await Promise.all(toUpdate.map((u) => tx.visit.update({ where: { id: u.id }, data: u.fields })));
      }

      return tx.weeklyPlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: { existingVisits: true, prospectVisits: true },
      });
    },
    { timeout: 20000 }
  );

  // Fire-and-forget: notifying the Line Manager must never delay the save
  // response, and must never fail the save.
  notifyLineManagerOfPlanChange(kamId).catch(() => {});
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
  notifyLineManagerOfPlanChange(kamId).catch(() => {});
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
  await createNotificationsForUsers([updated.kamId], {
    label: approved
      ? `Your weekly plan for week of ${updated.weekStartDate} was approved`
      : `Your weekly plan for week of ${updated.weekStartDate} needs revision`,
    link: '/app/weekly-plans',
  });
  const [withOutcomes] = await attachVisitOutcomes([updated]);
  return withOutcomes;
};