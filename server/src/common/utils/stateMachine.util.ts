// server/src/common/utils/stateMachine.util.ts — FULL REPLACE
import { prisma } from '../../config/db';
import { logAudit } from './auditLog.util';
import { CUSTOMER_STATUS_TRANSITIONS } from '../constants/status.constant';
import { emitNotificationToUser } from '../../config/socket';
import { createNotificationsForUsers } from '../../modules/notifications/notifications.service';

import { humanizeStatus } from './humanize.util';

// "RATE APPROVED BY LM" -> "Rate approved by lm" — plain, readable sentence
// case for notification text.
const toSentenceCase = (s: string): string => {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const notifyCustomerWorkflowUsers = async (
  handledById: string,
  notification?: { label: string; link: string; isOverdue?: boolean },
  excludeUserId?: string,
) => {
  try {
    const notifyIds = new Set<string>([handledById]);

    const handler = await prisma.user.findUnique({ where: { id: handledById }, select: { lineManagerId: true } });

    if (handler?.lineManagerId) {
      notifyIds.add(handler.lineManagerId);
    } else {
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
  // Set to false for system/cron-triggered transitions where `actorId` is
  // just a placeholder (e.g. the KAM who owns the account) rather than a
  // real person who just clicked a button — otherwise that person would be
  // wrongly excluded from their own notification.
  notifyExcludeActor?: boolean;
}

export const transitionCustomerStatus = async ({
  customerId,
  toStatus,
  actorId,
  extraUpdates = {},
  historyAction,
  historySubText = '',
  ip,
  notifyExcludeActor = true,
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
    // what we just read.
    const { count } = await tx.customer.updateMany({
      where: { id: customerId, status: customer.status },
      data: { status: toStatus as any, ...extraUpdates },
    });
    if (count === 0) {
      throw new InvalidTransitionError(customer.status, toStatus);
    }
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
    notifyExcludeActor ? actorId : undefined,
  );
  return updated;
};