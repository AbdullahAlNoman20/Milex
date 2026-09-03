// server/src/common/utils/scopeGuard.util.ts
import { prisma } from "../../config/db";

export const assertLineManagerOwnsCustomer = async (customerId: string, lmId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { handledBy: { select: { lineManagerId: true } } },
  });
  if (!customer) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Customer not found' };
  if (customer.handledBy?.lineManagerId !== lmId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'This customer is not in your team' };
  }
};

// KAM's write access is scoped to only the customers they personally handle.
// Sales Coordinator and other elevated roles keep their existing, intentionally
// broader access (per VIEW_ALL_KAM_DASHBOARDS-style permissions) — this guard
// is a no-op for them by design, not an oversight.
export const assertKamOwnsCustomerIfKam = async (customerId: string, actorId: string, actorRole: string) => {
  if (actorRole !== 'KAM') return;
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { handledById: true } });
  if (!customer) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Customer not found' };
  if (customer.handledById !== actorId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have access to this customer record' };
  }
};

// A Line Manager may only view activity/reports for KAMs and Sales
// Coordinators actually assigned to them — not any staff member system-wide.
export const assertLineManagerOwnsKam = async (kamId: string, lmId: string) => {
  const kam = await prisma.user.findUnique({ where: { id: kamId }, select: { lineManagerId: true } });
  if (!kam) throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found' };
  if (kam.lineManagerId !== lmId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'This team member is not in your team' };
  }
};
