// server/src/common/utils/scopeGuard.util.ts
import { prisma } from "../../config/db";

const getActorRole = async (actorId: string): Promise<string | null> => {
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { role: { select: { name: true } } },
  });
  return actor?.role.name ?? null;
};

// Only these roles are ever "unassigned staff" that any Line Manager may
// pick up. A Line Manager / HOD / Super Admin also has lineManagerId = null,
// and treating that as "unassigned" used to hand every Line Manager access
// to every other manager's own accounts.
export const SUBORDINATE_ROLES = ['KAM', 'SALES_COORDINATOR'];

export const isUnassignedSubordinate = (
  lineManagerId: string | null | undefined,
  roleName: string | null | undefined,
): boolean => (lineManagerId ?? null) === null && SUBORDINATE_ROLES.includes(roleName || '');

// Line Manager scoping, with two deliberate exceptions:
//  1. SUPER_ADMIN is never scoped — it is the system-wide override role.
//  2. If the owning KAM/SC has no Line Manager assigned yet, ANY Line
//     Manager may act. Without this, an unassigned staff member's records
//     could never be approved by anyone and the workflow would deadlock —
//     this mirrors the same fallback the notification layer already uses.
export const assertLineManagerOwnsCustomer = async (customerId: string, actorId: string) => {
  const [customer, actorRole] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        isDeleted: true,
        handledById: true,
        handledBy: { select: { lineManagerId: true, role: { select: { name: true } } } },
      },
    }),
    getActorRole(actorId),
  ]);
  if (!customer || customer.isDeleted) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
  }
  // Both sit above the individual Line Managers: every employee reports up to
  // the Head of Department, so neither is scoped to one team's records.
  if (actorRole === 'SUPER_ADMIN' || actorRole === 'HEAD_OF_DEPARTMENT') return;

  // An account this person holds themselves is always theirs.
  if (customer.handledById === actorId) return;

  const ownerLineManagerId = customer.handledBy?.lineManagerId ?? null;
  if (ownerLineManagerId === actorId) return;
  if (isUnassignedSubordinate(ownerLineManagerId, customer.handledBy?.role?.name)) return;

  throw { statusCode: 403, code: 'FORBIDDEN', message: 'You can only manage customers handled by your own team.' };
};

// KAM's write access is scoped to only the customers they personally handle.
// Sales Coordinator and other elevated roles keep their existing, intentionally
// broader access (per VIEW_ALL_KAM_DASHBOARDS-style permissions) — this guard
// is a no-op for them by design, not an oversight.
// A manager who raised a recommendation holds it exactly as a KAM would, so
// the steps that belong to the account's owner are open to them too. Only a
// KAM is narrowed here, because only a KAM can be handed someone else's
// account by mistake.
export const assertKamOwnsCustomerIfKam = async (customerId: string, actorId: string, actorRole: string) => {
  if (actorRole !== 'KAM') return;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { handledById: true, isDeleted: true },
  });
  if (!customer || customer.isDeleted) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
  }
  if (customer.handledById !== actorId) {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'This customer isn\'t assigned to you, so you can\'t make changes here.',
    };
  }
};

// A Line Manager may only view activity/reports for KAMs and Sales
// Coordinators actually assigned to them. Same two exceptions as above.
export const assertLineManagerOwnsKam = async (kamId: string, lmId: string) => {
  const [kam, actorRole] = await Promise.all([
    prisma.user.findUnique({
      where: { id: kamId },
      select: { lineManagerId: true, role: { select: { name: true } } },
    }),
    getActorRole(lmId),
  ]);
  if (!kam) throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that team member.' };
  if (actorRole === 'SUPER_ADMIN' || actorRole === 'HEAD_OF_DEPARTMENT') return;
  if (kamId === lmId) return;
  if (kam.lineManagerId === lmId) return;
  if (isUnassignedSubordinate(kam.lineManagerId, kam.role?.name)) return;
  throw { statusCode: 403, code: 'FORBIDDEN', message: 'This team member doesn\'t report to you, so you can\'t view their activity.' };
};