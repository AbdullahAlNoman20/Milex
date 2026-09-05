// src/common/utils/stateMachine.util.ts
import { prisma } from '../../config/db';
import { logAudit } from './auditLog.util';
import { CUSTOMER_STATUS_TRANSITIONS } from '../constants/status.constant';
import { emitNotificationToUser } from '../../config/socket';
import { createNotificationsForUsers } from '../../modules/notifications/notifications.service';

import { humanizeStatus } from './humanize.util';

// "RATE APPROVED BY LM" -> "Rate approved by lm" — plain, readable sentence
// case for notification text. Not perfect grammar for acronyms like "LM",
// but far more readable than shouting-caps for a non-technical reader.
const toSentenceCase = (s: string): string => {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// Fires an instant realtime ping to everyone who works this customer's
// pipeline (the handling KAM/SC, plus every Line Manager and Sales
// Coordinator, since they all share the same queue). A push failure here
// must never break the actual data-changing action, hence the try/catch.
export const notifyCustomerWorkflowUsers = async (
  handledById: string,
  notification?: { label: string; link: string; isOverdue?: boolean },
  excludeUserId?: string,
) => {
  try {
    const notifyIds = new Set<string>([handledById]);

    const handler = await prisma.user.findUnique({ where: { id: handledById }, select: { lineManagerId: true } });

    if (handler?.lineManagerId) {
      // Scoped: only the Line Manager this KAM/SC is actually assigned to
      // gets pinged — not every Line Manager in the system.
      notifyIds.add(handler.lineManagerId);
    } else {
      // No LM assigned yet — fall back to notifying every active LM so
      // nothing silently falls through the cracks.
      const unassignedFallback = await prisma.user.findMany({
        where: { role: { name: 'LINE_MANAGER' }, isActive: true },
        select: { id: true },
      });
      unassignedFallback.forEach((u) => notifyIds.add(u.id));
    }

    const scs = await prisma.user.findMany({
      where: { role: { name: 'SALES_COORDINATOR' }, isActive: true },
      select: { id: true },
    });
    scs.forEach((u) => notifyIds.add(u.id));

    // Don't notify the person who just performed the action about their
    // own action.
    if (excludeUserId) notifyIds.delete(excludeUserId);

    if (notification) {
      await createNotificationsForUsers(Array.from(notifyIds), notification);
    } else {
      notifyIds.forEach((id) => emitNotificationToUser(id));
    }
  } catch (err) {
    console.warn('[socket] notifyCustomerWorkflowUsers failed (non-fatal):', (err as Error)?.message);
  }
};

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`This action isn't available right now (current status: ${humanizeStatus(from)}).`);
    this.name = 'InvalidTransitionError';
  }
}

interface TransitionParams {
  customerId: string;
  toStatus: string;
  actorId: string;
  extraUpdates?: Record<string, unknown>;
  historyAction: string;
  historySubText?: string;
  ip?: string | null;
}

// Every status-changing action across every module goes through this — never a
// direct `prisma.customer.update({ data: { status } })` anywhere else.
export const transitionCustomerStatus = async ({
  customerId,
  toStatus,
  actorId,
  extraUpdates = {},
  historyAction,
  historySubText = '',
  ip,
}: TransitionParams) => {
  const updated = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('Customer not found');

    const allowed = CUSTOMER_STATUS_TRANSITIONS[customer.status] || [];
    if (!allowed.includes(toStatus)) {
      throw new InvalidTransitionError(customer.status, toStatus);
    }

    const beforeState = { status: customer.status };

    // Optimistic concurrency: only apply the transition if status is still
    // what we just read. If another concurrent request already moved this
    // customer to a different status, count will be 0 and we fail loudly
    // instead of silently overwriting a status change we never validated.
    const { count } = await tx.customer.updateMany({
      where: { id: customerId, status: customer.status },
      data: { status: toStatus as any, ...extraUpdates },
    });
    if (count === 0) {
      throw new InvalidTransitionError(customer.status, toStatus);
    }
    // Always include handledBy so every caller that merges this returned
    // object into a customer list (frontend SalesContext) keeps showing the
    // Assigned KAM column instead of it silently disappearing after an action.
    const updated = await tx.customer.findUniqueOrThrow({
      where: { id: customerId },
      include: { handledBy: { select: { name: true } } },
    });

    await tx.customerHistoryEntry.updateMany({
      where: { customerId, status: 'active' },
      data: { status: 'completed' },
    });

    await tx.customerHistoryEntry.create({
      data: {
        customerId,
        action: historyAction.toUpperCase().slice(0, 200),
        subText: historySubText.slice(0, 300),
        status: 'active',
      },
    });

    await logAudit({
      entity: 'Customer',
      entityId: customerId,
      action: historyAction,
      actorId,
      beforeState,
      afterState: { status: toStatus },
     ip,
    });

    return updated;
  });

  await notifyCustomerWorkflowUsers(
    updated.handledById,
    { label: `${updated.accountName} — ${toSentenceCase(historyAction)}`, link: `/app/customers/${updated.barcode}` },
    actorId,
  );
  return updated;
};