// src/common/utils/stateMachine.util.ts
import { prisma } from '../../config/db';
import { logAudit } from './auditLog.util';
import { CUSTOMER_STATUS_TRANSITIONS } from '../constants/status.constant';

import { humanizeStatus } from './humanize.util';

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
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('Customer not found');

    const allowed = CUSTOMER_STATUS_TRANSITIONS[customer.status] || [];
    if (!allowed.includes(toStatus)) {
      throw new InvalidTransitionError(customer.status, toStatus);
    }

    const beforeState = { status: customer.status };

    const updated = await tx.customer.update({
      where: { id: customerId },
      data: { status: toStatus as any, ...extraUpdates },
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
};