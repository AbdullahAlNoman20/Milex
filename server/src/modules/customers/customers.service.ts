// src/modules/customers/customers.service.ts
import { prisma } from '../../config/db';
import { CUSTOMER_STATUS } from '../../common/constants/status.constant';
import { transitionCustomerStatus, notifyCustomerWorkflowUsers } from '../../common/utils/stateMachine.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { sanitizeAndEscape } from './sanitize.helper';
import { uploadFileToSupabase, deleteFileFromSupabase } from '../file-storage/fileStorage.service';
import { runFileScan } from '../../jobs/file-scan.job';
import { humanizeStatus } from '../../common/utils/humanize.util';
import { ensureServiceProvidersExist } from '../service-providers/serviceProviders.service';
import { sendCustomerAccountEmail } from '../../jobs/notification.job';
import { emitNotificationToUser } from '../../config/socket';
import { assertLineManagerOwnsCustomer, assertKamOwnsCustomerIfKam } from '../../common/utils/scopeGuard.util';
import { assertValidCreditPeriodValue, isCreditPeriodField } from '../../common/utils/creditRules.util';
import { createNotificationsForUsers } from '../notifications/notifications.service';

const generateBarcode = () => `MLX${Math.floor(100000 + Math.random() * 900000)}`;
export const generateRateRef = () => `MLX${Math.floor(1000000 + Math.random() * 9000000)}`;

// Every returned Customer object that might get merged into the frontend's
// customer list must include this — otherwise the Assigned KAM column
// silently disappears for that row (this was the exact "majhe majhe dekha
// jay jayna" bug).
const CUSTOMER_WITH_HANDLER = { handledBy: { select: { name: true } } } as const;

const MAX_ID_GENERATION_ATTEMPTS = 5;

const generateUniqueBarcode = async (): Promise<string> => {
  for (let i = 0; i < MAX_ID_GENERATION_ATTEMPTS; i += 1) {
    const candidate = generateBarcode();
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.customer.findUnique({ where: { barcode: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw { statusCode: 500, code: 'ID_GENERATION_FAILED', message: 'Could not generate a unique barcode, please try again' };
};

const generateUniqueRateRef = async (): Promise<string> => {
  for (let i = 0; i < MAX_ID_GENERATION_ATTEMPTS; i += 1) {
    const candidate = generateRateRef();
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.customer.findFirst({ where: { rateRef: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw { statusCode: 500, code: 'ID_GENERATION_FAILED', message: 'Could not generate a unique rate reference, please try again' };
};

export const listCustomers = async (
  page: number,
  pageSize: number,
  filters: { status?: string; search?: string },
  requester: { id: string; role: string }
) => {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    // Strip a "REF-" prefix and any "-R2" revision suffix if the user pasted
    // the full formatted reference badge (e.g. "REF-MLX1707581-R2") instead
    // of just the raw code — keeps matching cheap (single indexed-ish OR)
    // rather than adding a second round-trip.
    const cleaned = filters.search.replace(/^REF-/i, '').replace(/-R\d+$/i, '');
    where.OR = [
      { accountName: { contains: filters.search, mode: 'insensitive' } },
      { barcode: { contains: filters.search, mode: 'insensitive' } },
      { rateRef: { contains: cleaned, mode: 'insensitive' } },
    ];
  }
  where.isDeleted = false;
  // KAM only sees their own handled accounts unless elevated — horizontal scoping.
  if (requester.role === 'KAM') {
    where.handledById = requester.id;
  } else if (requester.role === 'LINE_MANAGER') {
    // Staff with no Line Manager assigned yet are visible to every Line
    // Manager — the same fallback the notification layer uses, so a record
    // can never become invisible (and therefore unactionable) to everyone.
    where.handledBy = { OR: [{ lineManagerId: requester.id }, { lineManagerId: null }] };
  }

  // The list view never renders offer/agreement bodies or rate history, and
  // those are by far the largest columns. Excluding them cuts the payload
  // per record by roughly 80%, which is what makes loading thousands of
  // records practical. The detail page fetches the full record separately.
  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, barcode: true, accountName: true, address: true, phone: true, email: true,
        businessType: true, serviceRequired: true, accountMode: true, accountType: true,
        creditLimitTk: true, creditPeriodDays: true, creditPeriodExtendedByLM: true,
        proposedRate: true, approvedRate: true, lmNote: true, recNote: true, rejectReason: true,
        rateRef: true, offerSent: true, offerAccepted: true, agreementSent: true,
        finalProfileCompleted: true, accountConfigMode: true, managingPartnerName: true,
        binNumber: true, tinNumber: true, preferredCarrier: true, natureOfBusiness: true,
        gainType: true, financeMode: true, area: true, zone: true,
        revision: true, status: true, accountProfileType: true,
        provisionalCreatedAt: true, provisionalExpiryDate: true, provisionalExtensionDays: true,
        followUpDate: true, followUpNote: true,
        recommendedById: true, handledById: true,
        createdAt: true, updatedAt: true,
        handledBy: { select: { name: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
};

export const getCustomerByBarcode = async (barcode: string, requester: { id: string; role: string }) => {
  const customer = await prisma.customer.findUnique({
    where: { barcode },
    include: {
      contacts: true,
      shippingDetails: true,
      history: { orderBy: { createdAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' } },
      extensionRequests: true,
      handledBy: { select: { name: true, lineManagerId: true } },
    },
  });
  if (!customer || customer.isDeleted) throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };

  if (requester.role === 'KAM' && customer.handledById !== requester.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'This customer isn\'t assigned to you, so you can\'t view this record.' };
  }
  if (
    requester.role === 'LINE_MANAGER' &&
    customer.handledBy?.lineManagerId != null &&
    customer.handledBy.lineManagerId !== requester.id
  ) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'This customer belongs to a different team, so you can\'t view this record.' };
  }
  return customer;
};

export const createRecommendation = async (data: any, kamId: string) => {
  const clean = sanitizeAndEscape(data);
  if (clean.creditPeriodDays) {
    assertValidCreditPeriodValue(clean.creditPeriodDays);
  }
  const barcode = await generateUniqueBarcode();

  const customer = await prisma.customer.create({
    data: {
      barcode,
      accountName: clean.accountName,
      address: clean.address,
      phone: clean.phone,
      email: clean.email,
      businessType: clean.businessType,
      serviceRequired: clean.serviceRequired,
      accountMode: clean.accountMode,
      accountType: clean.accountType,
      creditLimitTk: clean.creditLimitTk,
      creditPeriodDays: clean.creditPeriodDays || '15',
      creditPeriodExtendedByLM: false,
      proposedRate: clean.proposedRate,
      recNote: clean.recNote,
      status: CUSTOMER_STATUS.PENDING_RATE_APPROVAL as any,
      recommendedById: kamId,
      handledById: kamId,
      contacts: { create: data.contacts },
      shippingDetails: { create: data.shippingDetails },
      history: {
        create: { action: 'RECOMMENDATION FORM CREATED BY KAM', status: 'active' },
      },
    },
    include: { contacts: true, shippingDetails: true },
  });

  logAudit({ entity: 'Customer', entityId: customer.id, action: 'RECOMMENDATION_CREATED', actorId: kamId, afterState: { barcode } }).catch(() => {});

  // Notify every active Line Manager that a new recommendation needs rate
  // approval — persisted so it shows up in their notification bell/page,
  // not just a silent socket ping.
  // Scoped to this KAM's own Line Manager; only falls back to every LM when
  // the KAM has not been assigned one yet.
  const kam = await prisma.user.findUnique({ where: { id: kamId }, select: { lineManagerId: true } });
  const lineManagers = kam?.lineManagerId
    ? [{ id: kam.lineManagerId }]
    : await prisma.user.findMany({ where: { role: { name: 'LINE_MANAGER' }, isActive: true }, select: { id: true } });
  createNotificationsForUsers(
    lineManagers.map((lm) => lm.id),
    { label: `${customer.accountName} — New recommendation submitted, needs rate approval`, link: `/app/customers/${barcode}` },
  ).catch(() => {});



  // Persist any new "Others" carrier name(s) typed in this submission so
  // they show up as normal dropdown options on every future recommendation
  // form. Providers can be a comma-separated multi-select value.
  const providerNames = (data.shippingDetails || [])
    .flatMap((s: any) => (s.provider || '').split(',').map((p: string) => p.trim()))
    .filter(Boolean);
  ensureServiceProvidersExist(providerNames).catch(() => {});

  return customer;
};

export const approveRate = async (customerId: string, data: any, lmId: string) => {
  await assertLineManagerOwnsCustomer(customerId, lmId);
  if (data.creditPeriodDays !== undefined && data.creditPeriodDays !== null && data.creditPeriodDays !== '') {
    assertValidCreditPeriodValue(data.creditPeriodDays);
  }
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const now = new Date();
  const expiry = new Date(now.getTime() + 21 * 86400000);
  const rateRef = existing.rateRef || (await generateUniqueRateRef());
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    actorId: lmId,
    extraUpdates: {
      approvedRate: data.approvedRate,
      lmNote: data.lmNote,
      creditPeriodDays: data.creditPeriodDays,
      creditPeriodExtendedByLM: !!data.creditPeriodExtendedByLM,
      accountProfileType: 'PROVISIONAL',
      provisionalCreatedAt: now,
      provisionalExpiryDate: expiry,
      provisionalExtensionDays: 0,
      rateRef,
      offerSent: false,
      offerAccepted: false,
      agreementSent: false,
    },
    historyAction: 'RATE APPROVED BY LM — PROVISIONAL CUSTOMER CREATED',
    historySubText: 'Document upload window started (21 days)',
    // The Sales Coordinator must now send the offer letter, so this is one
    // of the few steps where they genuinely need to be told.
    notifySalesCoordinators: true,
  });
};

export const rejectRate = async (customerId: string, lmId: string) => {
  await assertLineManagerOwnsCustomer(customerId, lmId);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PENDING_RATE_PREPARATION,
    actorId: lmId,
    extraUpdates: { revision: customer.revision + 1 },
    historyAction: 'RATE REJECTED BY LM',
    historySubText: `Revision R-${customer.revision + 1} requested`,
  });
};

export const draftOffer = async (customerId: string, scId: string) =>
  transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.DRAFTING_OFFER_LETTER,
    actorId: scId,
    historyAction: 'DRAFTING OFFER LETTER',
    historySubText: 'SC editing generated letter',
  });

export const finalizeOffer = async (customerId: string, offerText: string, scId: string) => {
  // Offer send/accept/reject is a sub-loop that happens entirely while the
  // customer stays PROVISIONAL_ACTIVE — no CustomerStatus transition needed,
  // so it can be resent as many times as the customer requires (per 2.1.3.1)
  // without ever routing back through Line Manager.
  //
  // Because it skips transitionCustomerStatus it also skipped every guard
  // that function applies, which meant an offer could be "sent" on an
  // already-active, deleted, or expired account straight from the API.
  // The guard is applied explicitly here instead.
  const clean = sanitizeAndEscape({ offerText });
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.customer.findUnique({
      where: { id: customerId },
      select: { status: true, isDeleted: true },
    });
    if (!current || current.isDeleted) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    }
    if (current.status !== CUSTOMER_STATUS.PROVISIONAL_ACTIVE) {
      throw {
        statusCode: 409,
        code: 'INVALID_STATE',
        message: `The offer letter can't be sent right now (current status: ${humanizeStatus(current.status)}).`,
      };
    }
    const customer = await tx.customer.update({
      where: { id: customerId },
      data: { offerText: clean.offerText, offerSent: true, offerAccepted: false },
      include: CUSTOMER_WITH_HANDLER,
    });
    await tx.customerHistoryEntry.updateMany({
      where: { customerId, status: 'active' },
      data: { status: 'completed' },
    });
    await tx.customerHistoryEntry.create({
      data: { customerId, action: 'OFFER LETTER SENT', subText: 'Awaiting customer feedback via KAM', status: 'active' },
    });
    return customer;
  });
  logAudit({ entity: 'Customer', entityId: customerId, action: 'OFFER_LETTER_SENT', actorId: scId, afterState: { offerSent: true } }).catch(() => {});
  // Goes to the KAM (who collects the customer's feedback) and their Line
  // Manager only — no other Sales Coordinator has anything to do here.
  notifyCustomerWorkflowUsers(
    updated.handledById,
    { label: `${updated.accountName} — Offer letter sent, awaiting customer feedback`, link: `/app/customers/${updated.barcode}` },
    scId,
  ).catch(() => {});
  return updated;
};

export const sendAgreement = async (customerId: string, agreementText: string, scId: string) => {
  const clean = sanitizeAndEscape({ agreementText });
  const updated = await prisma.$transaction(async (tx) => {
    // Same explicit guard as finalizeOffer: the agreement may only be sent
    // on a live provisional account whose offer the customer has accepted.
    const current = await tx.customer.findUnique({
      where: { id: customerId },
      select: { status: true, isDeleted: true, offerAccepted: true },
    });
    if (!current || current.isDeleted) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    }
    if (current.status !== CUSTOMER_STATUS.PROVISIONAL_ACTIVE) {
      throw {
        statusCode: 409,
        code: 'INVALID_STATE',
        message: `The agreement can't be sent right now (current status: ${humanizeStatus(current.status)}).`,
      };
    }
    if (!current.offerAccepted) {
      throw {
        statusCode: 409,
        code: 'OFFER_NOT_ACCEPTED',
        message: 'The customer needs to accept the offer before the agreement can be sent.',
      };
    }
    const customer = await tx.customer.update({
      where: { id: customerId },
      data: { agreementText: clean.agreementText, agreementSent: true },
      include: CUSTOMER_WITH_HANDLER,
    });
    await tx.customerHistoryEntry.updateMany({
      where: { customerId, status: 'active' },
      data: { status: 'completed' },
    });
    await tx.customerHistoryEntry.create({
      data: {
        customerId,
        action: 'AGREEMENT SENT TO CUSTOMER',
        subText: 'Document upload unlocked for KAM',
        status: 'active',
      },
    });
    return customer;
  });
  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'AGREEMENT_SENT',
    actorId: scId,
    afterState: { agreementSent: true },
  }).catch(() => {});
  notifyCustomerWorkflowUsers(
    updated.handledById,
    { label: `${updated.accountName} — Agreement sent to customer`, link: `/app/customers/${updated.barcode}` },
    scId,
  ).catch(() => {});
  return updated;
};

export const submitClientFeedback = async (
  customerId: string,
  data: { accepted: boolean; rejectReason?: string },
  kamId: string
) => {
  if (data.accepted) {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({
        where: { id: customerId },
        select: { status: true, isDeleted: true, offerSent: true },
      });
      if (!current || current.isDeleted) {
        throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
      }
      if (current.status !== CUSTOMER_STATUS.PROVISIONAL_ACTIVE || !current.offerSent) {
        throw {
          statusCode: 409,
          code: 'INVALID_STATE',
          message: 'Customer feedback can only be recorded after an offer letter has been sent.',
        };
      }
      const customer = await tx.customer.update({
        where: { id: customerId },
        data: { offerAccepted: true },
        include: CUSTOMER_WITH_HANDLER,
      });
      await tx.customerHistoryEntry.updateMany({ where: { customerId, status: 'active' }, data: { status: 'completed' } });
      await tx.customerHistoryEntry.create({
        data: { customerId, action: 'OFFER ACCEPTED BY CUSTOMER', subText: 'Awaiting Sales Coordinator to send the Agreement', status: 'active' },
      });
      return customer;
    });
    logAudit({ entity: 'Customer', entityId: customerId, action: 'OFFER_ACCEPTED', actorId: kamId, afterState: { offerAccepted: true } }).catch(() => {});
    // The Sales Coordinator is next in line (prepare the agreement), so
    // they are included here — unlike on rejection, which goes to the LM.
    notifyCustomerWorkflowUsers(
      updated.handledById,
      { label: `${updated.accountName} — Customer accepted the offer, please prepare the agreement`, link: `/app/customers/${updated.barcode}` },
      kamId,
      { includeSalesCoordinators: true },
    ).catch(() => {});
    return updated;
  }

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const clean = sanitizeAndEscape({ r: data.rejectReason || '' });
  // A rejection now routes back through the Line Manager for a fresh
  // approved rate — the Sales Coordinator can no longer resend without
  // that re-approval. transitionCustomerStatus already handles the
  // history entry, audit log, and notification for us.
  const updated = await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE,
    actorId: kamId,
    extraUpdates: {
      offerSent: false,
      offerAccepted: false,
      rejectReason: clean.r,
      revision: customer.revision + 1,
    },
    historyAction: 'OFFER REJECTED BY CUSTOMER',
    historySubText: clean.r,
  });
  return updated;
};

export const reapproveRateAfterRejection = async (
  customerId: string,
  approvedRate: string,
  lmNote: string | undefined,
  lmId: string,
) => {
  await assertLineManagerOwnsCustomer(customerId, lmId);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const clean = sanitizeAndEscape({ approvedRate, lmNote: lmNote || '' });

  const previousEntry = {
    rate: customer.approvedRate || customer.proposedRate || '',
    rateRef: customer.rateRef || '',
    changedAt: new Date().toISOString(),
  };
  const newRateRef = await generateUniqueRateRef();

  await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    actorId: lmId,
    extraUpdates: {
      approvedRate: clean.approvedRate,
      lmNote: clean.lmNote || null,
      rateRef: newRateRef,
      rejectReason: null,
    },
    historyAction: 'NEW RATE APPROVED BY LM',
    historySubText: 'Awaiting Sales Coordinator to send the revised offer letter',
    notifySalesCoordinators: true,
  });

  // Kept as a separate, simple update right after — pushing to a Json[]
  // history field isn't supported inside transitionCustomerStatus's
  // concurrency-safe updateMany, so it's appended here instead.
  return prisma.customer.update({
    where: { id: customerId },
    data: { rateHistory: { push: previousEntry } },
    include: CUSTOMER_WITH_HANDLER,
  });
};

export const reviseRateAfterRejection = async (customerId: string, proposedRate: string, kamId: string) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
    actorId: kamId,
    extraUpdates: { proposedRate: sanitizeAndEscape({ proposedRate }).proposedRate, revision: customer.revision + 1 },
    historyAction: 'REVISED RATE SUBMITTED TO LM',
  });
};

export const draftAgreement = async (customerId: string, scId: string) =>
  transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.DRAFTING_AGREEMENT,
    actorId: scId,
    historyAction: 'DRAFTING AGREEMENT',
    historySubText: 'SC editing SLA clauses',
  });

export const finalizeAgreement = async (customerId: string, agreementText: string, scId: string) =>
  transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.AGREEMENT_SENT_AWAITING_SIGNATURE,
    actorId: scId,
    extraUpdates: { agreementText: sanitizeAndEscape({ agreementText }).agreementText },
    historyAction: 'AGREEMENT FINALIZED',
    historySubText: 'Awaiting signature',
  });

// Agreement signed -> becomes Provisional Customer (Section 6, Step 2 Case A analog for
// direct path) OR straight Active if not flagged provisional.
export const activateAsProvisional = async (customerId: string, kamId: string) => {
  const now = new Date();
  const expiry = new Date(now.getTime() + 21 * 86400000);
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    actorId: kamId,
    extraUpdates: {
      accountProfileType: 'PROVISIONAL',
      provisionalCreatedAt: now,
      provisionalExpiryDate: expiry,
      provisionalExtensionDays: 0,
    },
    historyAction: 'AGREEMENT SIGNED — PROVISIONAL ACCOUNT CREATED',
    historySubText: '21-day document upload window started',
  });
};

export const activateDirectly = async (customerId: string, kamId: string) =>
  transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.ACTIVE_ACCOUNT,
    actorId: kamId,
    historyAction: 'AGREEMENT SIGNED — ACCOUNT ACTIVATED',
  });

export const requestInfoUpdate = async (customerId: string, field: string, newValue: string, kamId: string) => {
  const clean = sanitizeAndEscape({ field, newValue });
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.INFO_UPDATE_PENDING_LM_APPROVAL,
    actorId: kamId,
    extraUpdates: {
      pendingInfoUpdateField: clean.field,
      pendingInfoUpdateValue: clean.newValue,
      pendingInfoUpdateAt: new Date(),
    },
    historyAction: 'INFO UPDATE REQUESTED BY KAM',
    historySubText: 'Awaiting Line Manager approval',
  });
};

export const decideInfoUpdate = async (customerId: string, approve: boolean, lmId: string) => {
  await assertLineManagerOwnsCustomer(customerId, lmId);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const extraUpdates: Record<string, unknown> = {
    pendingInfoUpdateField: null,
    pendingInfoUpdateValue: null,
    pendingInfoUpdateAt: null,
  };
  if (approve && customer.pendingInfoUpdateField) {
    extraUpdates[customer.pendingInfoUpdateField] = customer.pendingInfoUpdateValue;
  }
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.ACTIVE_ACCOUNT,
    actorId: lmId,
    extraUpdates,
    historyAction: approve ? 'INFO UPDATE APPROVED BY LM' : 'INFO UPDATE REJECTED BY LM',
  });
};

export const updateFollowUp = async (
  customerId: string,
  data: { followUpDate?: string | null; followUpNote?: string },
  actorId: string
) => {
  await assertLineManagerOwnsCustomer(customerId, actorId);
  const before = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      followUpNote: data.followUpNote ? sanitizeAndEscape({ n: data.followUpNote }).n : undefined,
    },
    include: CUSTOMER_WITH_HANDLER,
  });
  await logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'FOLLOWUP_UPDATED',
    actorId,
    beforeState: { followUpDate: before.followUpDate, followUpNote: before.followUpNote },
    afterState: { followUpDate: updated.followUpDate, followUpNote: updated.followUpNote },
  });
  return updated;
};

// Previously this returned EVERY pipeline customer to anyone who asked,
// with no scoping and no limit — one Line Manager could read another team's
// customer names, rates, credit terms and client feedback. Now it applies
// exactly the same visibility rules as the customer list, and selects only
// the columns the follow-up view actually renders.
export const deriveFollowUps = async (requester: { id: string; role: string }) => {
  const where: any = {
    isDeleted: false,
    status: { not: CUSTOMER_STATUS.ACTIVE_ACCOUNT as any },
  };
  if (requester.role === 'KAM') {
    where.handledById = requester.id;
  } else if (requester.role === 'LINE_MANAGER') {
    where.handledBy = { OR: [{ lineManagerId: requester.id }, { lineManagerId: null }] };
  }

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ followUpDate: 'asc' }, { createdAt: 'desc' }],
    take: 500,
    select: {
      id: true, barcode: true, accountName: true, status: true,
      recNote: true, lmNote: true, proposedRate: true, approvedRate: true,
      rejectReason: true, followUpDate: true, followUpNote: true,
    },
  });
  const now = Date.now();
  return customers
    .map((c) => ({
      customerId: c.id,
      barcode: c.barcode,
      accountName: c.accountName,
      status: c.status,
      commitment: c.recNote || c.lmNote || '',
      proposedRate: c.proposedRate || '',
      approvedRate: c.approvedRate || '',
      clientFeedback: c.rejectReason || '',
      followUpDate: c.followUpDate,
      followUpNote: c.followUpNote || '',
      isOverdue: c.followUpDate ? c.followUpDate.getTime() < now : false,
    }))
    .sort((a, b) => (b.isOverdue === a.isOverdue ? 0 : b.isOverdue ? 1 : -1));
};

export const updateFinalProfile = async (customerId: string, data: any, actorId: string, actorRole: string) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  const clean = sanitizeAndEscape(data);
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { ...clean, finalProfileCompleted: true },
    include: CUSTOMER_WITH_HANDLER,
  });
  await logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'FINAL_ACCOUNT_PROFILE_SAVED',
    actorId,
    afterState: clean,
  });
  return updated;
};

export const setAccountConfigMode = async (customerId: string, mode: 'REGULAR' | 'PROVISIONAL', actorId: string, actorRole: string) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { accountConfigMode: mode },
    include: CUSTOMER_WITH_HANDLER,
  });
  await logAudit({ entity: 'Customer', entityId: customerId, action: 'ACCOUNT_CONFIG_MODE_SET', actorId, afterState: { accountConfigMode: mode } });
  return updated;
};

// Regular-mode final submission now also routes through Line Manager review
// (same gate as Provisional), instead of activating the account immediately.
const REQUIRED_FINAL_DOC_TYPES = ['TRADE_LICENSE', 'CUSTOMER_BIN', 'CUSTOMER_TIN', 'SIGNED_OFFER_LETTER', 'OFFER_RATE_RECEIPT'];

export const submitFinalOnboardingRegular = async (customerId: string, actorId: string, actorRole: string) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId }, include: { documents: true } });
  const docsByType = new Map(customer.documents.map((d) => [d.documentType, d]));
  const missingDocs = REQUIRED_FINAL_DOC_TYPES.filter((t) => !docsByType.has(t));
  if (missingDocs.length > 0) {
    const humanNames = missingDocs.map((t) => DOCUMENT_TYPE_LABELS[t] || t);
    throw { statusCode: 409, code: 'DOCUMENTS_NOT_READY', message: `Please upload the following before submitting: ${humanNames.join(', ')}.` };
  }
  const notCleanDocs = REQUIRED_FINAL_DOC_TYPES.filter((t) => docsByType.get(t)?.scanStatus !== 'CLEAN');
  if (notCleanDocs.length > 0) {
    throw { statusCode: 409, code: 'DOCUMENTS_NOT_READY', message: 'One or more of your uploaded documents are still being checked. Please wait a moment and try again.' };
  }

  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
    actorId,
    extraUpdates: { accountProfileType: 'REGULAR' },
    historyAction: 'FINAL ONBOARDING REQUESTED (REGULAR ACCOUNT)',
    historySubText: 'Awaiting Line Manager final verification',
  });
};

export type EditFieldType = 'text' | 'textarea' | 'number' | 'select' | 'document';

export interface EditFieldDef {
  label: string;
  type: EditFieldType;
  options?: { value: string; label: string }[];
}

export const EDITABLE_FIELDS: Record<string, EditFieldDef> = {
  accountName: { label: 'Account Name', type: 'text' },
  address: { label: 'Address', type: 'textarea' },
  phone: { label: 'Phone', type: 'text' },
  email: { label: 'Email', type: 'text' },
  businessType: {
    label: 'Business Type', type: 'select',
    options: ['Leather', 'Garments', 'Textile', 'Electronics', 'Pharmaceuticals'].map((v) => ({ value: v, label: v })),
  },
  serviceRequired: {
    label: 'Service Required', type: 'select',
    options: [{ value: 'IB', label: 'IB' }, { value: 'OB', label: 'OB' }, { value: 'BOTH', label: 'BOTH' }],
  },
  accountMode: {
    label: 'Account Mode', type: 'select',
    // 'Fair' kept as a selectable option only so any customer still carrying
    // the old value can be edited without the dropdown showing blank; new
    // selections should use 'Freight'.
    options: [{ value: 'Express', label: 'Express' }, { value: 'Freight', label: 'Freight' }, { value: 'Fair', label: 'Fair (legacy)' }],
  },
  accountType: {
    label: 'Account Type', type: 'select',
    options: [{ value: 'CREDIT CUSTOMER', label: 'Credit Customer' }, { value: 'CASH', label: 'Cash' }],
  },
  creditLimitTk: { label: 'Credit Limit (TK)', type: 'number' },
  creditPeriodDays: { label: 'Credit Period (Days)', type: 'number' },
  managingPartnerName: { label: 'Managing Partner', type: 'text' },
  binNumber: { label: 'BIN Number', type: 'text' },
  tinNumber: { label: 'TIN Number', type: 'text' },
  destinations: { label: 'Destinations', type: 'textarea' },
  preferredCarrier: { label: 'Preferred Carrier', type: 'text' },
  natureOfBusiness: { label: 'Nature of Business', type: 'text' },
  gainType: {
    label: 'Type', type: 'select',
    options: [{ value: 'NEW_GAIN', label: 'N. Gain' }, { value: 'REGAIN', label: 'R. Gain' }, { value: 'AC_UPDATE', label: 'A/C Update' }],
  },
  financeMode: {
    label: 'Mode', type: 'select',
    options: [{ value: 'EX', label: 'Ex' }, { value: 'FR', label: 'FR' }],
  },
  area: { label: 'Area', type: 'text' },
  zone: { label: 'Zone', type: 'text' },
  specialInstructions: { label: 'Special Instructions', type: 'textarea' },
  approvedRate: { label: 'Approved Rate (Revision)', type: 'textarea' },
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  SIGNED_OFFER_LETTER: 'Signed Offer Letter', OFFER_RATE_RECEIPT: 'Offer & Rate Receipt',
  SIGNED_AGREEMENT: 'Signed Agreement', CUSTOMER_TIN: 'Customer TIN', CUSTOMER_BIN: 'Customer BIN',
  TRADE_LICENSE: 'Trade License', OTHERS: 'Other Document',
};

const CONTACT_COLUMNS: Record<string, string> = { name: 'Name', designation: 'Designation', mobile: 'Mobile', email: 'Email' };
const CONTACT_KEY_RE = /^contact:([a-zA-Z0-9-]{10,50}):(name|designation|mobile|email)$/;

const parseContactKey = (fieldKey: string) => {
  const m = CONTACT_KEY_RE.exec(fieldKey);
  return m ? { contactId: m[1], column: m[2] } : null;
};

const resolveFieldLabelAndOldValue = async (customerId: string, fieldKey: string) => {
  const contactRef = parseContactKey(fieldKey);
  if (contactRef) {
    const contact = await prisma.contact.findFirst({ where: { id: contactRef.contactId, customerId } });
    if (!contact) return null;
    return {
      label: `${humanizeStatus(contact.type)} — ${CONTACT_COLUMNS[contactRef.column]}`,
      oldValue: (contact as any)[contactRef.column] ?? null,
    };
  }
  const def = EDITABLE_FIELDS[fieldKey];
  if (!def) return null;
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  return { label: def.label, oldValue: (customer as any)?.[fieldKey]?.toString() ?? null };
};

export const requestFieldChange = async (
  customerId: string,
  fieldKey: string | undefined,
  newValue: string | undefined,
  reason: string | undefined,
  documentType: string | undefined,
  requesterId: string,
  requesterRole: string
) => {
  await assertKamOwnsCustomerIfKam(customerId, requesterId, requesterRole);
  const isDocRequest = !!documentType;
  let label: string | undefined;
  let oldValue: string | null = null;

  if (isDocRequest) {
    label = DOCUMENT_TYPE_LABELS[documentType!];
  } else {
    if (!fieldKey) throw { statusCode: 400, code: 'INVALID_FIELD', message: 'fieldKey is required' };
    const resolved = await resolveFieldLabelAndOldValue(customerId, fieldKey);
    if (!resolved) throw { statusCode: 400, code: 'INVALID_FIELD', message: 'This field can\'t be edited through a request. Please choose a different field.' };
    label = resolved.label;
    oldValue = resolved.oldValue;
  }
  if (!label) throw { statusCode: 400, code: 'INVALID_FIELD', message: 'This field can\'t be edited through a request. Please choose a different field.' };
  if (!isDocRequest && !newValue?.trim()) throw { statusCode: 400, code: 'MISSING_VALUE', message: 'Please enter the new value before submitting.' };

  const clean = sanitizeAndEscape({ v: newValue || '', r: reason || '' });
  const request = await prisma.fieldChangeRequest.create({
    data: {
      customerId,
      fieldKey: isDocRequest ? `document:${documentType}` : fieldKey!,
      fieldLabel: label,
      oldValue: isDocRequest ? null : oldValue,
      newValue: isDocRequest ? null : clean.v,
      reason: clean.r || null,
      documentType: documentType || null,
      requestedById: requesterId,
    },
  });
  await logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'FIELD_CHANGE_REQUESTED',
    actorId: requesterId,
    beforeState: isDocRequest ? undefined : { [label]: oldValue },
    afterState: isDocRequest ? { [label]: 'Re-upload requested' } : { [label]: clean.v },
  });
  const ownerForRequest = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { handledById: true, accountName: true, barcode: true },
  });
  if (ownerForRequest) {
    // An edit request is for the Line Manager to decide on — no Sales
    // Coordinator involvement, so none of them are notified.
    notifyCustomerWorkflowUsers(
      ownerForRequest.handledById,
      { label: `${ownerForRequest.accountName} — Edit request: ${label}`, link: `/app/customers/${ownerForRequest.barcode}` },
      requesterId,
    ).catch(() => {});
  }
  return request;
};

export const requestDocumentChange = async (
  customerId: string,
  documentType: string,
  reason: string | undefined,
  fileBuffer: Buffer,
  originalName: string,
  requesterId: string,
  requesterRole: string
) => {
  await assertKamOwnsCustomerIfKam(customerId, requesterId, requesterRole);
  const label = DOCUMENT_TYPE_LABELS[documentType];
  if (!label) throw { statusCode: 400, code: 'INVALID_DOCUMENT_TYPE', message: 'This document category isn\'t recognized. Please refresh the page and try again.' };

  const { storageKey, mimeType, sizeBytes } = await uploadFileToSupabase(fileBuffer, originalName);
  const clean = sanitizeAndEscape({ r: reason || '', n: originalName });

  const request = await prisma.fieldChangeRequest.create({
    data: {
      customerId,
      fieldKey: `document:${documentType}`,
      fieldLabel: label,
      reason: clean.r || null,
      documentType,
      pendingFileStorageKey: storageKey,
      pendingFileName: clean.n,
      pendingFileMime: mimeType,
      pendingFileSize: sizeBytes,
      requestedById: requesterId,
    },
  });
  logAudit({ entity: 'Customer', entityId: customerId, action: 'DOCUMENT_REUPLOAD_REQUESTED', actorId: requesterId, afterState: { documentType } }).catch(() => {});
  const ownerForDocRequest = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { handledById: true, accountName: true, barcode: true },
  });
  if (ownerForDocRequest) {
    notifyCustomerWorkflowUsers(
      ownerForDocRequest.handledById,
      { label: `${ownerForDocRequest.accountName} — Edit request: ${label}`, link: `/app/customers/${ownerForDocRequest.barcode}` },
      requesterId,
    ).catch(() => {});
  }
  return request;
};

export const listFieldChangeRequests = async (customerId: string, requester: { id: string; role: string }) => {
  await assertKamOwnsCustomerIfKam(customerId, requester.id, requester.role);
  if (requester.role === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, requester.id);
  }
  return prisma.fieldChangeRequest.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
};

export const decideFieldChangeRequest = async (requestId: string, approve: boolean, lmId: string) => {
  const request = await prisma.fieldChangeRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.approved !== null) {
    throw { statusCode: 409, code: 'ALREADY_DECIDED', message: 'This request has already been decided. Please refresh the page.' };
  }
  await assertLineManagerOwnsCustomer(request.customerId, lmId);

  // Validate BEFORE marking the request decided, so a rejected value can
  // never leave the request stuck in an "approved but not applied" state.
  if (approve && !request.documentType && !parseContactKey(request.fieldKey) && isCreditPeriodField(request.fieldKey)) {
    assertValidCreditPeriodValue(request.newValue || '');
  }

  // The decision flag and the actual data change now commit together — one
  // can no longer succeed without the other.
  const { decidedCustomer, previousStorageKey, newDocumentId, auditAction } = await prisma.$transaction(
    async (tx) => {
      await tx.fieldChangeRequest.update({
        where: { id: requestId },
        data: { approved: approve, decidedById: lmId, decidedAt: new Date() },
      });

      let previousStorageKey: string | null = null;
      let newDocumentId: string | null = null;
      let auditAction = 'FIELD_CHANGE_REJECTED';

      if (approve && request.documentType && request.pendingFileStorageKey) {
        auditAction = 'DOCUMENT_REUPLOAD_APPROVED';
        const existing = await tx.onboardingDocument.findFirst({
          where: { customerId: request.customerId, documentType: request.documentType },
        });
        previousStorageKey = existing?.storageKey ?? null;
        const doc = existing
          ? await tx.onboardingDocument.update({
              where: { id: existing.id },
              data: {
                originalName: request.pendingFileName!,
                storageKey: request.pendingFileStorageKey,
                mimeType: request.pendingFileMime!,
                sizeBytes: request.pendingFileSize!,
                uploadedById: request.requestedById,
                scanStatus: 'PENDING',
              },
            })
          : await tx.onboardingDocument.create({
              data: {
                customerId: request.customerId,
                documentType: request.documentType,
                originalName: request.pendingFileName!,
                storageKey: request.pendingFileStorageKey,
                mimeType: request.pendingFileMime!,
                sizeBytes: request.pendingFileSize!,
                uploadedById: request.requestedById,
                scanStatus: 'PENDING',
              },
            });
        newDocumentId = doc.id;
      } else if (approve && request.documentType) {
        // Approved a re-upload slot request that has no file attached yet
        // (e.g. requested via the old checkbox-only flow) — no-op besides the log.
        auditAction = 'DOCUMENT_REUPLOAD_APPROVED';
      } else if (approve) {
        auditAction = 'FIELD_CHANGE_APPROVED';
        const contactRef = parseContactKey(request.fieldKey);
        if (contactRef) {
          await tx.contact.update({ where: { id: contactRef.contactId }, data: { [contactRef.column]: request.newValue } });
        } else if (request.fieldKey === 'approvedRate') {
          // Rate revision: keep the previous rate + rate reference in history,
          // and issue a fresh rate reference for the newly approved rate.
          const target = await tx.customer.findUniqueOrThrow({ where: { id: request.customerId } });
          const previousEntry = {
            rate: target.approvedRate || target.proposedRate || '',
            rateRef: target.rateRef || '',
            changedAt: new Date().toISOString(),
          };
          const newRateRef = await generateUniqueRateRef();
          await tx.customer.update({
            where: { id: request.customerId },
            data: {
              approvedRate: request.newValue,
              rateRef: newRateRef,
              revision: { increment: 1 },
              rateHistory: { push: previousEntry },
            },
          });
        } else {
          await tx.customer.update({ where: { id: request.customerId }, data: { [request.fieldKey]: request.newValue } });
        }
      }

      const decidedCustomer = await tx.customer.findUniqueOrThrow({
        where: { id: request.customerId },
        include: CUSTOMER_WITH_HANDLER,
      });

      return { decidedCustomer, previousStorageKey, newDocumentId, auditAction };
    },
    { timeout: 20000 }
  );

  // File I/O and scanning stay OUTSIDE the transaction — they are slow and
  // must never hold a database connection open.
  if (previousStorageKey && previousStorageKey !== request.pendingFileStorageKey) {
    deleteFileFromSupabase(previousStorageKey).catch(() => {});
  }
  // A rejected re-upload left its file sitting on disk forever, because the
  // file is written at request time, before anyone has approved it. The
  // FieldChangeRequest row itself is kept (who asked, for what, when, and
  // the approved/rejected decision) — only the payload is removed.
  if (!approve && request.pendingFileStorageKey) {
    deleteFileFromSupabase(request.pendingFileStorageKey).catch(() => {});
    prisma.fieldChangeRequest
      .update({ where: { id: requestId }, data: { pendingFileStorageKey: null } })
      .catch(() => {});
  }
  if (newDocumentId) {
    runFileScan(newDocumentId).catch(() => {});
  }

  logAudit({
    entity: 'Customer',
    entityId: request.customerId,
    action: auditAction,
    actorId: lmId,
    beforeState: request.documentType ? undefined : { [request.fieldLabel]: request.oldValue },
    afterState: request.documentType ? { documentType: request.documentType } : { [request.fieldLabel]: request.newValue },
  }).catch(() => {});

  // The requester gets a specific, personal message about their own
  // request's outcome...
  createNotificationsForUsers([request.requestedById], {
    label: `${decidedCustomer.accountName} — Your edit request for "${request.fieldLabel}" was ${approve ? 'approved' : 'rejected'}`,
    link: `/app/customers/${decidedCustomer.barcode}`,
  }).catch(() => {});
  // ...and the rest of the workflow group (excluding the LM who just
  // decided) gets a general heads-up that this record changed.
  notifyCustomerWorkflowUsers(
    decidedCustomer.handledById,
    { label: `${decidedCustomer.accountName} — Edit request ${approve ? 'approved' : 'rejected'}: ${request.fieldLabel}`, link: `/app/customers/${decidedCustomer.barcode}` },
    lmId,
  ).catch(() => {});

  return decidedCustomer;
};

// Line Manager can also just edit any field (including contact sub-fields)
// directly, bypassing the request flow entirely.
// Recommendation-form fields — KAM/SC may keep editing these directly all
// the way up to account activation (i.e. throughout the provisional
// period). Account-profile fields (final onboarding data, added later by
// KAM/SC/LM once the rate is approved) are deliberately excluded here —
// those always require an edit request, regardless of status.
const RECOMMENDATION_FIELD_KEYS = [
  'accountName',
  'address',
  'phone',
  'email',
  'businessType',
  'serviceRequired',
  'accountMode',
  'accountType',
  'creditLimitTk',
  'creditPeriodDays',
];

export const directFieldEdit = async (
  customerId: string,
  fieldKey: string,
  newValue: string,
  actorId: string,
  actorRole: string
) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });

  // Sales Coordinators no longer get direct-edit access at all — every
  // change they make must go through an edit request for the Line Manager
  // to approve, regardless of the customer's current status.
  if (actorRole === 'SALES_COORDINATOR') {
    throw {
      statusCode: 403,
      code: 'REQUEST_REQUIRED',
      message: 'As a Sales Coordinator, changes to customer details must be submitted as a request for your Line Manager to approve.',
    };
  }
  if (actorRole === 'KAM') {
    if (customer.status === 'ACTIVE_ACCOUNT') {
      throw {
        statusCode: 403,
        code: 'REQUEST_REQUIRED',
        message: 'This account is already active. To change anything now, please submit an edit request for your Line Manager to review.',
      };
    }
    if (!parseContactKey(fieldKey) && !RECOMMENDATION_FIELD_KEYS.includes(fieldKey)) {
      throw {
        statusCode: 403,
        code: 'FIELD_NOT_DIRECTLY_EDITABLE',
        message: 'This field can only be changed by submitting an edit request for your Line Manager to review.',
      };
    }
  }

  if (isCreditPeriodField(fieldKey)) {
    assertValidCreditPeriodValue(newValue);
  }

  const contactRef = parseContactKey(fieldKey);
  const clean = sanitizeAndEscape({ v: newValue });

if (contactRef) {
    const contact = await prisma.contact.findFirst({ where: { id: contactRef.contactId, customerId } });
    if (!contact) throw { statusCode: 400, code: 'INVALID_FIELD', message: 'Contact not found on this customer' };
    const oldValue = (contact as any)[contactRef.column] ?? null;
    const label = (await resolveFieldLabelAndOldValue(customerId, fieldKey))?.label || fieldKey;
    await prisma.contact.update({ where: { id: contactRef.contactId }, data: { [contactRef.column]: clean.v } });
    await logAudit({
      entity: 'Customer',
      entityId: customerId,
      action: 'FIELD_DIRECTLY_EDITED',
      actorId,
      beforeState: { [label]: oldValue },
      afterState: { [label]: clean.v },
    });
    notifyCustomerWorkflowUsers(customer.handledById, {
      label: `${customer.accountName} — ${label} was updated`,
      link: `/app/customers/${customer.barcode}`,
    }, actorId).catch(() => {});
    return prisma.customer.findUniqueOrThrow({ where: { id: customerId }, include: CUSTOMER_WITH_HANDLER });
  }

  if (!EDITABLE_FIELDS[fieldKey]) throw { statusCode: 400, code: 'INVALID_FIELD', message: 'This field cannot be edited' };
  const oldValue = (customer as any)[fieldKey]?.toString() ?? null;
  const label = EDITABLE_FIELDS[fieldKey].label;

  let updated;
  if (fieldKey === 'approvedRate') {
    const previousEntry = {
      rate: customer.approvedRate || customer.proposedRate || '',
      rateRef: customer.rateRef || '',
      changedAt: new Date().toISOString(),
    };
    updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        approvedRate: clean.v,
        rateRef: await generateUniqueRateRef(),
        revision: { increment: 1 },
        rateHistory: { push: previousEntry },
      },
      include: CUSTOMER_WITH_HANDLER,
    });
  } else {
    updated = await prisma.customer.update({
      where: { id: customerId },
      data: { [fieldKey]: clean.v },
      include: CUSTOMER_WITH_HANDLER,
    });
  }

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'FIELD_DIRECTLY_EDITED',
    actorId,
    beforeState: { [label]: oldValue },
    afterState: { [label]: clean.v },
  }).catch(() => {});
  notifyCustomerWorkflowUsers(customer.handledById, {
    label: `${customer.accountName} — ${label} was updated`,
    link: `/app/customers/${customer.barcode}`,
  }, actorId).catch(() => {});
  return updated;
};

export const getEditableFieldDefs = (scope?: string) => {
  const entries = Object.entries(EDITABLE_FIELDS);
  const filtered =
    scope === 'recommendation' ? entries.filter(([key]) => RECOMMENDATION_FIELD_KEYS.includes(key)) : entries;
  return filtered.map(([key, def]) => ({ key, ...def }));
};

export const uploadRecommendationAttachment = async (
  customerId: string,
  buffer: Buffer,
  originalName: string,
  requesterId: string,
  requesterRole?: string
) => {
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  if (requesterRole !== 'SUPER_ADMIN' && customer.recommendedById !== requesterId) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only the KAM who created this recommendation can attach this document.' };
  }
  const { storageKey, mimeType, sizeBytes } = await uploadFileToSupabase(buffer, originalName);
  const cleanName = sanitizeAndEscape({ n: originalName }).n;
  const existing = await prisma.onboardingDocument.findFirst({ where: { customerId, documentType: 'RECOMMENDATION_ATTACHMENT' } });
  const previousStorageKey = existing?.storageKey;
  const doc = existing
    ? await prisma.onboardingDocument.update({
        where: { id: existing.id },
        data: { originalName: cleanName, storageKey, mimeType, sizeBytes, uploadedById: requesterId, scanStatus: 'PENDING' },
      })
    : await prisma.onboardingDocument.create({
        data: {
          customerId,
          documentType: 'RECOMMENDATION_ATTACHMENT',
          originalName: cleanName,
          storageKey,
          mimeType,
          sizeBytes,
          uploadedById: requesterId,
          scanStatus: 'PENDING',
        },
      });
  if (previousStorageKey && previousStorageKey !== storageKey) {
    await deleteFileFromSupabase(previousStorageKey);
  }
  await runFileScan(doc.id);
  await logAudit({ entity: 'OnboardingDocument', entityId: doc.id, action: 'RECOMMENDATION_ATTACHMENT_UPLOADED', actorId: requesterId });
  return doc;
};

export const softDeleteCustomer = async (customerId: string, actorId: string) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: { handledBy: { select: { id: true, name: true, lineManagerId: true } } },
  });
  await prisma.customer.update({ where: { id: customerId }, data: { isDeleted: true } });
  await logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'CUSTOMER_DELETED',
    actorId,
    beforeState: { isDeleted: false },
    afterState: {
      isDeleted: true,
      barcode: customer.barcode,
      accountName: customer.accountName,
      handledById: customer.handledById,
      handledByName: customer.handledBy?.name,
      lineManagerId: customer.handledBy?.lineManagerId || null,
    },
  });
};

export const reassignCustomer = async (customerId: string, newKamId: string, actorId: string) => {
  const [customer, newKam] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
    prisma.user.findUniqueOrThrow({ where: { id: newKamId }, include: { role: true } }),
  ]);
  if (newKam.role.name !== 'KAM') {
    throw { statusCode: 400, code: 'INVALID_ASSIGNEE', message: 'Customers can only be reassigned to a Key Account Manager.' };
  }
  const previousKamId = customer.handledById;
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { handledById: newKamId },
    include: CUSTOMER_WITH_HANDLER,
  });
  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'CUSTOMER_REASSIGNED',
    actorId,
    beforeState: { handledById: previousKamId },
    afterState: { handledById: newKamId },
  }).catch(() => {});
  notifyCustomerWorkflowUsers(newKamId, {
    label: `${updated.accountName} — This customer has been assigned to you`,
    link: `/app/customers/${updated.barcode}`,
  }, actorId).catch(() => {});
  return updated;
};

// Only these actions represent an actual field/document "edit" (direct edit,
// or an edit-request that was approved/rejected) — everything else the
// customer's audit trail records (status transitions, offers, rate
// approvals, account creation, etc.) belongs to the workflow timeline
// (AuditTrail component), not the "Edit History" view.
const EDIT_HISTORY_ACTIONS = [
  'FIELD_DIRECTLY_EDITED',
  'FIELD_CHANGE_REQUESTED',
  'FIELD_CHANGE_APPROVED',
  'FIELD_CHANGE_REJECTED',
  'DOCUMENT_REUPLOAD_REQUESTED',
  'DOCUMENT_REUPLOAD_APPROVED',
];

export const listCustomerEditHistory = async (customerId: string, requester: { id: string; role: string }) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: { handledBy: { select: { lineManagerId: true } } },
  });
  if (requester.role === 'KAM' && customer.handledById !== requester.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'This customer isn\'t assigned to you, so you can\'t view this record.' };
  }
  if (
    requester.role === 'LINE_MANAGER' &&
    customer.handledBy?.lineManagerId != null &&
    customer.handledBy.lineManagerId !== requester.id
  ) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'This customer belongs to a different team, so you can\'t view this record.' };
  }
  return prisma.auditLog.findMany({
    where: { entity: 'Customer', entityId: customerId, action: { in: EDIT_HISTORY_ACTIONS } },
    orderBy: { createdAt: 'desc' },
    take: 150,
    include: { actor: { select: { name: true, email: true } } },
  });
};