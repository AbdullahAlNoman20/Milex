// server/src/common/utils/stateMachine.util.ts
import { prisma } from '../../config/db';
import { logAudit } from './auditLog.util';
import { CUSTOMER_STATUS_TRANSITIONS } from '../constants/status.constant';
import { createNotificationsForUsers } from '../../modules/notifications/notifications.service';

import { humanizeStatus } from './humanize.util';

// "RATE APPROVED BY LM" -> "Rate approved by lm" — plain, readable sentence
// case for notification text.
const toSentenceCase = (s: string): string => {
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export interface NotifyAudience {
  // Sales Coordinators are only pulled in for the handful of steps where
  // the ball is actually in their court (send the offer, resend a revised
  // offer, prepare the agreement). Previously EVERY workflow action wrote a
  // row for every Sales Coordinator in the system, which buried their real
  // tasks and multiplied database writes by the size of the SC team.
  includeSalesCoordinators?: boolean;
}

export const notifyCustomerWorkflowUsers = async (
  handledById: string,
  notification?: { label: string; link: string; isOverdue?: boolean },
  excludeUserId?: string,
  audience: NotifyAudience = {},
) => {
  try {
    const notifyIds = new Set<string>([handledById]);

    const handler = await prisma.user.findUnique({
      where: { id: handledById },
      select: { lineManagerId: true },
    });

    if (handler?.lineManagerId) {
      // Scoped: only the Line Manager this KAM/SC is actually assigned to.
      notifyIds.add(handler.lineManagerId);
    } else {
      // No LM assigned yet — fall back to every active LM so nothing
      // silently falls through the cracks.
      const allLms = await prisma.user.findMany({
        where: { role: { name: 'LINE_MANAGER' }, isActive: true },
        select: { id: true },
      });
      allLms.forEach((u) => notifyIds.add(u.id));
    }

    if (audience.includeSalesCoordinators) {
      const scs = await prisma.user.findMany({
        where: { role: { name: 'SALES_COORDINATOR' }, isActive: true },
        select: { id: true },
      });
      scs.forEach((u) => notifyIds.add(u.id));
    }

    if (excludeUserId) notifyIds.delete(excludeUserId);
    if (notifyIds.size === 0) return;

    await createNotificationsForUsers(
      Array.from(notifyIds),
      notification ?? { label: 'A customer record you follow was updated', link: '/app/customers' },
    );
  } catch (err) {
    console.warn('[notifications] notifyCustomerWorkflowUsers failed (non-fatal):', (err as Error)?.message);
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
  // Only true for the steps that hand work to the Sales Coordinator.
  notifySalesCoordinators?: boolean;
  // Set for a step whose audience is not the usual workflow group — an
  // escalation to the Head of Department, for instance, concerns only them
  // until they answer. The caller sends whatever notification it needs.
  skipWorkflowNotification?: boolean;
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
  notifySalesCoordinators = false,
  skipWorkflowNotification = false,
}: TransitionParams) => {
  const updated = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    if (customer.isDeleted) throw { statusCode: 409, code: 'CUSTOMER_DELETED', message: 'This customer has been removed, so it can no longer be changed.' };

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

    return { updated, beforeState };
  });

  // Audit and notification are deliberately OFF the response path. Waiting
  // on them was adding 100-300ms to every approve/reject click, and neither
  // should ever be able to fail the state change that already committed.
  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: historyAction,
    actorId,
    beforeState: updated.beforeState,
    afterState: { status: toStatus },
    ip,
  }).catch(() => {});

  if (!skipWorkflowNotification) {
    notifyCustomerWorkflowUsers(
      updated.updated.handledById,
      { label: `${updated.updated.accountName} — ${toSentenceCase(historyAction)}`, link: `/app/customers/${updated.updated.barcode}` },
      notifyExcludeActor ? actorId : undefined,
      { includeSalesCoordinators: notifySalesCoordinators },
    ).catch(() => {});
  }

  return updated.updated;
};