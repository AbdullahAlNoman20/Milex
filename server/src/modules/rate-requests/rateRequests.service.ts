// server/src/modules/rate-requests/rateRequests.service.ts
import { prisma } from '../../config/db';
import { logAudit } from '../../common/utils/auditLog.util';
import { sanitizeAndEscape } from '../customers/sanitize.helper';
import { notifyCustomerWorkflowUsers } from '../../common/utils/stateMachine.util';
import { createNotificationsForUsers } from '../notifications/notifications.service';
import { assertKamOwnsCustomerIfKam, assertLineManagerOwnsCustomer } from '../../common/utils/scopeGuard.util';
import { appendRateProcessStep } from '../../common/utils/rateProcess.util';
import { CUSTOMER_STATUS, RATE_PROCESS_STAGE } from '../../common/constants/status.constant';

const RATE_SOURCE_LABEL: Record<string, string> = {
  LINE_MANAGER: 'Line Manager',
  HEAD_OF_DEPARTMENT: 'Head of Department',
};

export const rateSourceLabel = (source?: string | null) =>
  (source && RATE_SOURCE_LABEL[source]) || 'Line Manager';

const toRateSource = (role: string) =>
  role === 'HEAD_OF_DEPARTMENT' || role === 'SUPER_ADMIN' ? 'HEAD_OF_DEPARTMENT' : 'LINE_MANAGER';

const CAN_SET_RATE = ['LINE_MANAGER', 'HEAD_OF_DEPARTMENT', 'SUPER_ADMIN'];

// Where a freshly set rate goes next. It goes back to whoever raised the
// re-quote, so they can decide whether it is good enough to put to the
// customer — unless they set it themselves, in which case pausing for their
// own approval of their own decision is a step that means nothing.
const stageAfterRate = (processOwnerId: string | null | undefined, setById: string) =>
  processOwnerId && processOwnerId !== setById
    ? RATE_PROCESS_STAGE.PENDING_OWNER_REVIEW
    : RATE_PROCESS_STAGE.PENDING_OFFER;

// Which desk a request starts at. A Line Manager has nobody below them to
// ask, and the Head of Department has nobody above them, so both of those go
// straight to the Head of Department's desk; everyone else stops at their own
// Line Manager first.
export const rateDeskStageFor = (requesterRole: string) =>
  requesterRole === 'LINE_MANAGER' ||
  requesterRole === 'HEAD_OF_DEPARTMENT' ||
  requesterRole === 'SUPER_ADMIN'
    ? RATE_PROCESS_STAGE.PENDING_HOD_RATE
    : RATE_PROCESS_STAGE.PENDING_LM_RATE;

const assertCanTouch = async (customerId: string, requester: { id: string; role: string }) => {
  await assertKamOwnsCustomerIfKam(customerId, requester.id, requester.role);
  if (requester.role === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, requester.id);
  }
};

const loadLiveCustomer = async (customerId: string) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  if (customer.isDeleted) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
  }
  return customer;
};

const notifyHods = async (label: string, link: string) => {
  const hods = await prisma.user.findMany({
    where: { role: { name: 'HEAD_OF_DEPARTMENT' }, isActive: true },
    select: { id: true },
  });
  if (hods.length === 0) return;
  await createNotificationsForUsers(hods.map((h) => h.id), { label, link });
};

const notifyLineManagerOf = async (handledById: string, label: string, link: string) => {
  const handler = await prisma.user.findUnique({
    where: { id: handledById },
    select: { lineManagerId: true, role: { select: { name: true } } },
  });
  let ids: string[] = [];
  if (handler?.lineManagerId) ids = [handler.lineManagerId];
  else if (handler?.role?.name === 'KAM' || handler?.role?.name === 'SALES_COORDINATOR') {
    const lms = await prisma.user.findMany({
      where: { role: { name: 'LINE_MANAGER' }, isActive: true },
      select: { id: true },
    });
    ids = lms.map((l) => l.id);
  }
  if (ids.length === 0) return;
  await createNotificationsForUsers(ids, { label, link });
};

export const listRateRequests = async (
  customerId: string,
  requester: { id: string; role: string }
) => {
  await assertCanTouch(customerId, requester);
  return prisma.rateRequest.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });
};

// A customer can ask for a different rate at any point, including long after
// their account went active, so this is deliberately not gated on workflow
// status — only on the requester being allowed to touch the record at all.
//
// It goes to the Line Manager first. It used to be sent straight to the Head
// of Department, which skipped the person who actually manages the account
// and left them finding out only once it had been answered.
export const createRateRequest = async (
  customerId: string,
  reason: string,
  followsRejection: boolean,
  requester: { id: string; role: string }
) => {
  await assertCanTouch(customerId, requester);
  const customer = await loadLiveCustomer(customerId);

  // One re-quote at a time, start to finish. A customer may come back for
  // different terms as often as they like, but not while the last set is
  // still travelling — a second rate raised mid-flight would replace an offer
  // letter already with the customer, or an agreement already being drawn up,
  // and nobody would know which figure they had actually been quoted.
  if (customer.rateProcessActive) {
    throw {
      statusCode: 409,
      code: 'RATE_PROCESS_IN_PROGRESS',
      message:
        'A new rate is already going through for this customer. Once it has been offered and answered, another can be raised.',
    };
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
  const stage = rateDeskStageFor(requester.role);

  const request = await prisma.rateRequest.create({
    data: {
      customerId,
      requestedById: requester.id,
      requestedByRole: requester.role as any,
      reason: clean.reason,
      followsRejection: !!followsRejection,
    },
  });

  await prisma.customer.update({
    where: { id: customerId },
    // Whoever raises it runs it: the rate comes back to them, and they are the
    // one who records what the customer says about it.
    data: { rateProcessActive: true, rateProcessStage: stage, rateProcessOwnerId: requester.id },
  });

  // This opens the re-quote episode; every step from here to the customer's
  // answer is recorded against it rather than the onboarding trail.
  appendRateProcessStep(prisma, customerId, requester.id, 'NEW RATE REQUESTED', clean.reason).catch(() => {});

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'NEW_RATE_REQUESTED',
    actorId: requester.id,
    afterState: { reason: clean.reason, followsRejection: !!followsRejection, stage },
  }).catch(() => {});

  const link = `/app/customers/${customer.barcode}`;
  if (stage === RATE_PROCESS_STAGE.PENDING_HOD_RATE) {
    notifyHods(`${customer.accountName} — A new best rate has been requested`, link).catch(() => {});
  } else {
    notifyLineManagerOf(
      customer.handledById,
      `${customer.accountName} — A new rate has been requested`,
      link
    ).catch(() => {});
  }

  return request;
};

// The Line Manager passes it up without answering it themselves.
export const escalateRateRequestToHod = async (
  customerId: string,
  reason: string,
  requester: { id: string; role: string }
) => {
  if (requester.role === 'KAM' || requester.role === 'SALES_COORDINATOR') {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only a Line Manager can pass a rate request up to the Head of Department.' };
  }
  await assertCanTouch(customerId, requester);
  const customer = await loadLiveCustomer(customerId);
  const clean = sanitizeAndEscape({ reason });

  if (
    customer.rateProcessStage === RATE_PROCESS_STAGE.PENDING_OWNER_REVIEW ||
    customer.rateProcessStage === RATE_PROCESS_STAGE.PENDING_OFFER ||
    customer.rateProcessStage === RATE_PROCESS_STAGE.AWAITING_FEEDBACK
  ) {
    throw {
      statusCode: 409,
      code: 'RATE_IN_FLIGHT',
      message:
        'This rate has already moved on. Wait for the customer to answer it before asking for another one.',
    };
  }

  const open = await prisma.rateRequest.findFirst({
    where: { customerId, approved: null },
    orderBy: { createdAt: 'desc' },
  });
  // A Line Manager may also start one here rather than answering an existing
  // ask, so a request row is created if there isn't one already.
  if (!open) {
    await prisma.rateRequest.create({
      data: {
        customerId,
        requestedById: requester.id,
        requestedByRole: requester.role as any,
        reason: clean.reason,
      },
    });
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      rateProcessActive: true,
      rateProcessStage: RATE_PROCESS_STAGE.PENDING_HOD_RATE,
      // A Line Manager passing an existing ask up leaves it with whoever
      // raised it; one they start here is their own to see through.
      ...(customer.rateProcessOwnerId ? {} : { rateProcessOwnerId: requester.id }),
      lmNote: clean.reason || null,
    },
    include: { handledBy: { select: { name: true } } },
  });

  appendRateProcessStep(
    prisma,
    customerId,
    requester.id,
    'BEST RATE REQUESTED FROM HEAD OF DEPARTMENT',
    clean.reason
  ).catch(() => {});

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'NEW_RATE_ESCALATED_TO_HOD',
    actorId: requester.id,
    afterState: { reason: clean.reason },
  }).catch(() => {});

  notifyHods(
    `${customer.accountName} — A best rate has been requested by the Line Manager`,
    `/app/customers/${customer.barcode}`
  ).catch(() => {});

  return updated;
};

// A Line Manager or the Head of Department sets the rate outright. Whether
// there was an open request or not, one is recorded and answered, so the
// history reads the same either way.
export const setNewRate = async (
  customerId: string,
  approvedRate: string,
  requester: { id: string; role: string }
) => {
  if (!CAN_SET_RATE.includes(requester.role)) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only a Line Manager or the Head of Department can set a new rate.' };
  }
  await assertCanTouch(customerId, requester);
  const clean = sanitizeAndEscape({ rate: approvedRate });
  if (!clean.rate) {
    throw { statusCode: 400, code: 'MISSING_RATE', message: 'Please enter the rate you are setting.' };
  }
  const source = toRateSource(requester.role);

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (current.isDeleted) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    }
    // A Line Manager cannot answer a request that has already been passed up
    // to the Head of Department — that is the whole point of passing it up.
    if (
      current.rateProcessStage === RATE_PROCESS_STAGE.PENDING_HOD_RATE &&
      source !== 'HEAD_OF_DEPARTMENT'
    ) {
      throw {
        statusCode: 409,
        code: 'AWAITING_HOD',
        message: 'This has been passed to the Head of Department, so only they can set the rate now.',
      };
    }
    // Once a rate has left this desk it is out of reach until it comes back.
    // Replacing it while the offer letter is being prepared, or while the
    // customer is considering it, would quote them one figure and record
    // another.
    if (
      current.rateProcessStage === RATE_PROCESS_STAGE.PENDING_OWNER_REVIEW ||
      current.rateProcessStage === RATE_PROCESS_STAGE.PENDING_OFFER ||
      current.rateProcessStage === RATE_PROCESS_STAGE.AWAITING_FEEDBACK
    ) {
      throw {
        statusCode: 409,
        code: 'RATE_IN_FLIGHT',
        message:
          'This rate has already moved on. Wait for the customer to answer it before setting another one.',
      };
    }

    const open = await tx.rateRequest.findFirst({
      where: { customerId, approved: null },
      orderBy: { createdAt: 'desc' },
    });
    const followsRejection = open?.followsRejection ?? false;

    if (open) {
      await tx.rateRequest.update({
        where: { id: open.id },
        data: {
          approved: true,
          grantedRate: clean.rate,
          grantedById: requester.id,
          grantedByRole: source as any,
          grantedAt: new Date(),
        },
      });
    } else {
      await tx.rateRequest.create({
        data: {
          customerId,
          requestedById: requester.id,
          requestedByRole: requester.role as any,
          reason: 'Rate set directly',
          approved: true,
          grantedRate: clean.rate,
          grantedById: requester.id,
          grantedByRole: source as any,
          grantedAt: new Date(),
        },
      });
    }

    const previousEntry = {
      rate: current.approvedRate || current.proposedRate || '',
      rateRef: current.rateRef || '',
      source: current.rateSource || null,
      changedAt: new Date().toISOString(),
      reason: open?.reason || 'Replaced by a new rate',
    };

    // A rate set with no request behind it is the setter's own episode.
    const processOwnerId = current.rateProcessOwnerId || requester.id;
    const stage = stageAfterRate(processOwnerId, requester.id);

    const result = await tx.customer.update({
      where: { id: customerId },
      data: {
        approvedRate: clean.rate,
        rateSource: source as any,
        rateSetById: requester.id,
        lmNote: null,
        // A re-quote is a new set of terms for the same customer, so it gets
        // its own reference — otherwise the invoice raised under the old rate
        // and the one raised under the new rate would quote the same code. A
        // rate answering a rejection is the exception: the counter already
        // moved when the customer turned the offer down.
        ...(followsRejection ? {} : { revision: { increment: 1 } }),
        rateHistory: { push: previousEntry },
        // The new rate has to be put to the customer, so the offer flags
        // reset. No documents are asked for again — they are already on file
        // from the original onboarding.
        offerRejected: false,
        offerSent: false,
        offerAccepted: false,
        rejectReason: null,
        rateProcessActive: true,
        rateProcessStage: stage,
        rateProcessOwnerId: processOwnerId,
      },
      include: { handledBy: { select: { name: true } } },
    });

    await appendRateProcessStep(
      tx,
      customerId,
      requester.id,
      `NEW RATE SET BY ${rateSourceLabel(source).toUpperCase()}`,
      `${clean.rate} — ${
        stage === RATE_PROCESS_STAGE.PENDING_OFFER
          ? 'Awaiting the Sales Coordinator to send the offer letter'
          : 'Awaiting review before it goes to the customer'
      }`
    );
    await tx.customer.update({ where: { id: customerId }, data: { rateProcessStage: stage } });

    return result;
  });

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'NEW_RATE_GRANTED',
    actorId: requester.id,
    afterState: { grantedRate: clean.rate, source },
  }).catch(() => {});

  const label = `${updated.accountName} — New rate set by ${rateSourceLabel(source)}: ${clean.rate}`;
  const link = `/app/customers/${updated.barcode}`;
  notifyCustomerWorkflowUsers(updated.handledById, { label, link }, requester.id, {
    includeSalesCoordinators: updated.rateProcessStage === RATE_PROCESS_STAGE.PENDING_OFFER,
  }).catch(() => {});

  // The person who raised it is the one now being asked to decide, and they
  // are not always in the workflow group above.
  if (
    updated.rateProcessStage === RATE_PROCESS_STAGE.PENDING_OWNER_REVIEW &&
    updated.rateProcessOwnerId &&
    updated.rateProcessOwnerId !== requester.id
  ) {
    createNotificationsForUsers([updated.rateProcessOwnerId], {
      label: `${updated.accountName} — A new rate is ready for your decision: ${clean.rate}`,
      link,
    }).catch(() => {});
  }

  return updated;
};

// Nothing changes and the episode closes.
export const declineRateRequest = async (
  customerId: string,
  note: string | undefined,
  requester: { id: string; role: string }
) => {
  if (!CAN_SET_RATE.includes(requester.role)) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only a Line Manager or the Head of Department can answer a rate request.' };
  }
  await assertCanTouch(customerId, requester);
  const clean = sanitizeAndEscape({ note: note || '' });

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (
      current.rateProcessStage === RATE_PROCESS_STAGE.PENDING_HOD_RATE &&
      toRateSource(requester.role) !== 'HEAD_OF_DEPARTMENT'
    ) {
      throw {
        statusCode: 409,
        code: 'AWAITING_HOD',
        message: 'This has been passed to the Head of Department, so only they can answer it now.',
      };
    }
    await tx.rateRequest.updateMany({
      where: { customerId, approved: null },
      data: {
        approved: false,
        grantedNote: clean.note || null,
        grantedById: requester.id,
        grantedAt: new Date(),
      },
    });
    await appendRateProcessStep(
      tx,
      customerId,
      requester.id,
      'NEW RATE REQUEST DECLINED',
      clean.note || 'The existing rate stands'
    );
    return tx.customer.update({
      where: { id: customerId },
      data: { rateProcessActive: false, rateProcessStage: null, rateProcessOwnerId: null },
      include: { handledBy: { select: { name: true } } },
    });
  });

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'NEW_RATE_REQUEST_DECLINED',
    actorId: requester.id,
    afterState: { note: clean.note || null },
  }).catch(() => {});

  notifyCustomerWorkflowUsers(
    updated.handledById,
    { label: `${updated.accountName} — Request for a new rate was declined`, link: `/app/customers/${updated.barcode}` },
    requester.id
  ).catch(() => {});

  return updated;
};

// The person who holds the account decides whether the new rate goes to the
// customer or goes back for a better one — exactly as they would on a fresh
// recommendation.
export const ownerDecideNewRate = async (
  customerId: string,
  accept: boolean,
  reason: string | undefined,
  requester: { id: string; role: string }
) => {
  await assertCanTouch(customerId, requester);
  const customer = await loadLiveCustomer(customerId);
  if (customer.rateProcessStage !== RATE_PROCESS_STAGE.PENDING_OWNER_REVIEW) {
    throw {
      statusCode: 409,
      code: 'INVALID_STATE',
      message: 'There is no new rate waiting for your decision right now. Please refresh the page.',
    };
  }
  // Whoever raised the re-quote decides what happens to the rate that came
  // back — not whoever happens to hold the account, which is a different
  // person whenever a manager asks for new terms themselves.
  if (customer.rateProcessOwnerId !== requester.id && requester.role !== 'SUPER_ADMIN') {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'This decision belongs to the person who asked for the new rate.',
    };
  }

  if (accept) {
    const updated = await prisma.$transaction(async (tx) => {
      await appendRateProcessStep(
        tx,
        customerId,
        requester.id,
        'NEW RATE ACCEPTED — SENT FOR OFFER LETTER',
        `${customer.approvedRate || ''} — Awaiting the Sales Coordinator to send the offer letter`
      );
      return tx.customer.update({
        where: { id: customerId },
        data: { rateProcessActive: true, rateProcessStage: RATE_PROCESS_STAGE.PENDING_OFFER },
        include: { handledBy: { select: { name: true } } },
      });
    });
    notifyCustomerWorkflowUsers(
      updated.handledById,
      { label: `${updated.accountName} — New rate accepted, please send the offer letter`, link: `/app/customers/${updated.barcode}` },
      requester.id,
      { includeSalesCoordinators: true }
    ).catch(() => {});
    return updated;
  }

  const clean = sanitizeAndEscape({ reason: reason || '' });
  if (!clean.reason) {
    throw { statusCode: 400, code: 'MISSING_REASON', message: 'Please say why a better rate is needed.' };
  }

  const stage = rateDeskStageFor(requester.role);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.rateRequest.create({
      data: {
        customerId,
        requestedById: requester.id,
        requestedByRole: requester.role as any,
        reason: clean.reason,
      },
    });
    await appendRateProcessStep(tx, customerId, requester.id, 'BETTER RATE REQUESTED AGAIN', clean.reason);
    return tx.customer.update({
      where: { id: customerId },
      data: { rateProcessActive: true, rateProcessStage: stage },
      include: { handledBy: { select: { name: true } } },
    });
  });

  const link = `/app/customers/${updated.barcode}`;
  if (stage === RATE_PROCESS_STAGE.PENDING_HOD_RATE) {
    notifyHods(`${updated.accountName} — A better rate has been asked for again`, link).catch(() => {});
  } else {
    notifyLineManagerOf(updated.handledById, `${updated.accountName} — A better rate has been asked for again`, link).catch(() => {});
  }
  return updated;
};