// server/src/modules/rate-requests/rateRequests.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { sanitizeAndEscape } from '../customers/sanitize.helper';
import { notifyCustomerWorkflowUsers } from '../../common/utils/stateMachine.util';
import { createNotificationsForUsers } from '../notifications/notifications.service';
import { assertKamOwnsCustomerIfKam, assertLineManagerOwnsCustomer } from '../../common/utils/scopeGuard.util';
import { appendRateProcessStep } from '../../common/utils/rateProcess.util';

// Which roles may actually answer a request for a better rate. A Line Manager
// can raise one but never grant their own — that is the whole point of
// escalating it.
const GRANTING_ROLES = ['HEAD_OF_DEPARTMENT', 'SUPER_ADMIN'];

const RATE_SOURCE_LABEL: Record<string, string> = {
  LINE_MANAGER: 'Line Manager',
  HEAD_OF_DEPARTMENT: 'Head of Department',
};

export const rateSourceLabel = (source?: string | null) =>
  (source && RATE_SOURCE_LABEL[source]) || 'Line Manager';

const toRateSource = (role: string) =>
  role === 'HEAD_OF_DEPARTMENT' || role === 'SUPER_ADMIN' ? 'HEAD_OF_DEPARTMENT' : 'LINE_MANAGER';

export const listRateRequests = async (
  customerId: string,
  requester: { id: string; role: string }
) => {
  await assertKamOwnsCustomerIfKam(customerId, requester.id, requester.role);
  if (requester.role === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, requester.id);
  }
  return prisma.rateRequest.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });
};

// A customer can ask for a different rate at any point, including long after
// their account went active, so this is deliberately not gated on workflow
// status — only on the requester being allowed to touch the record at all.
export const createRateRequest = async (
  customerId: string,
  reason: string,
  followsRejection: boolean,
  requester: { id: string; role: string }
) => {
  await assertKamOwnsCustomerIfKam(customerId, requester.id, requester.role);
  // A Line Manager raises requests for their own team's accounts only; the
  // Head of Department and Super Admin are unscoped by design.
  if (requester.role === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, requester.id);
  }

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { id: true, isDeleted: true, accountName: true, barcode: true, handledById: true },
  });
  if (customer.isDeleted) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
  }

  const open = await prisma.rateRequest.findFirst({ where: { customerId, approved: null } });
  if (open) {
    throw {
      statusCode: 409,
      code: 'REQUEST_ALREADY_OPEN',
      message: 'There is already a rate request waiting for a decision on this customer.',
    };
  }

  const clean = sanitizeAndEscape({ reason });
  const request = await prisma.rateRequest.create({
    data: {
      customerId,
      requestedById: requester.id,
      requestedByRole: requester.role as any,
      reason: clean.reason,
      followsRejection: !!followsRejection,
    },
  });

  // This opens the re-quote episode; every step from here to the customer's
  // answer is recorded against it rather than the onboarding trail.
  appendRateProcessStep(
    prisma,
    customerId,
    requester.id,
    'NEW RATE REQUESTED',
    clean.reason
  ).catch(() => {});

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'NEW_RATE_REQUESTED',
    actorId: requester.id,
    afterState: { reason: clean.reason, followsRejection: !!followsRejection },
  }).catch(() => {});

  // The decision belongs to the Head of Department, so they are told directly
  // rather than relying on the general workflow audience.
  prisma.user
    .findMany({ where: { role: { name: 'HEAD_OF_DEPARTMENT' }, isActive: true }, select: { id: true } })
    .then((hods) =>
      createNotificationsForUsers(
        hods.map((h) => h.id),
        {
          label: `${customer.accountName} — A new best rate has been requested`,
          link: `/app/customers/${customer.barcode}`,
        }
      )
    )
    .catch(() => {});

  notifyCustomerWorkflowUsers(
    customer.handledById,
    { label: `${customer.accountName} — New rate requested`, link: `/app/customers/${customer.barcode}` },
    requester.id
  ).catch(() => {});

  return request;
};

export const decideRateRequest = async (
  requestId: string,
  data: { approve: boolean; grantedRate?: string; grantedNote?: string },
  decider: { id: string; role: string }
) => {
  if (!GRANTING_ROLES.includes(decider.role)) {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the Head of Department can answer a request for a new best rate.',
    };
  }

  const request = await prisma.rateRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.approved !== null) {
    throw { statusCode: 409, code: 'ALREADY_DECIDED', message: 'This request has already been answered. Please refresh the page.' };
  }

  const clean = sanitizeAndEscape({
    rate: data.grantedRate || '',
    note: data.grantedNote || '',
  });
  const source = toRateSource(decider.role);

  // The decision and the rate it produces commit together — an approved
  // request can never be left without the rate it promised.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.rateRequest.update({
      where: { id: requestId },
      data: {
        approved: data.approve,
        grantedRate: data.approve ? clean.rate : null,
        grantedNote: clean.note || null,
        grantedById: decider.id,
        grantedByRole: data.approve ? (source as any) : null,
        grantedAt: new Date(),
      },
    });

    const current = await tx.customer.findUniqueOrThrow({ where: { id: request.customerId } });

    if (!data.approve) {
      await appendRateProcessStep(
        tx,
        request.customerId,
        decider.id,
        'NEW RATE REQUEST DECLINED',
        clean.note || 'The existing rate stands'
      );
      // The episode is over; nothing further is expected.
      await tx.customer.update({
        where: { id: request.customerId },
        data: { rateProcessActive: false },
      });
      return current;
    }

    // The rate being replaced is kept, with the reference it was issued
    // under, so the full sequence stays readable however many times the
    // customer sends it back.
    const previousEntry = {
      rate: current.approvedRate || current.proposedRate || '',
      rateRef: current.rateRef || '',
      source: current.rateSource || null,
      changedAt: new Date().toISOString(),
      reason: request.reason,
    };

    const result = await tx.customer.update({
      where: { id: request.customerId },
      data: {
        approvedRate: clean.rate,
        rateSource: source as any,
        rateSetById: decider.id,
        lmNote: clean.note || current.lmNote,
        // A live account being re-quoted is a new set of terms for the same
        // customer, so it gets its own reference — otherwise the invoice
        // raised under the old rate and the one raised under the new rate
        // would quote the same code.
        //
        // A rate that answers a rejection is the exception: the counter
        // already moved when the customer turned the offer down, and this
        // is the reply to that, not a further round.
        ...(request.followsRejection ? {} : { revision: { increment: 1 } }),
        rateHistory: { push: previousEntry },
        // A new rate always has to be put to the customer, whether it
        // followed a rejection or a request out of the blue. The offer flags
        // reset so the Sales Coordinator can send a fresh letter and the
        // customer can answer it — no documents are asked for again, because
        // they are already on file from the original onboarding.
        offerRejected: false,
        offerSent: false,
        offerAccepted: false,
        rejectReason: null,
      },
      include: { handledBy: { select: { name: true } } },
    });

    await appendRateProcessStep(
      tx,
      request.customerId,
      decider.id,
      `NEW RATE SET BY ${rateSourceLabel(source).toUpperCase()}`,
      'Awaiting the offer letter to be sent'
    );

    return result;
  });

  logAudit({
    entity: 'Customer',
    entityId: request.customerId,
    action: data.approve ? 'NEW_RATE_GRANTED' : 'NEW_RATE_REQUEST_DECLINED',
    actorId: decider.id,
    afterState: { grantedRate: data.approve ? clean.rate : null, source },
  }).catch(() => {});

  // Everyone involved is told who set the rate, not just that it changed —
  // after several revisions that is the part people actually need.
  const label = data.approve
    ? `${updated.accountName} — New rate set by ${rateSourceLabel(source)}: ${clean.rate}`
    : `${updated.accountName} — Request for a new rate was declined`;

  createNotificationsForUsers([request.requestedById], {
    label,
    link: `/app/customers/${updated.barcode}`,
  }).catch(() => {});

  notifyCustomerWorkflowUsers(
    updated.handledById,
    { label, link: `/app/customers/${updated.barcode}` },
    decider.id,
    { includeSalesCoordinators: data.approve && request.followsRejection }
  ).catch(() => {});

  return updated;
};