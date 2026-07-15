// src/modules/customers/customers.service.ts
import { prisma } from '../../config/db';
import { CUSTOMER_STATUS } from '../../common/constants/status.constant';
import { transitionCustomerStatus } from '../../common/utils/stateMachine.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { sanitizeAndEscape } from './sanitize.helper';

const generateBarcode = () => `MLX${Math.floor(100000 + Math.random() * 900000)}`;
const generateRateRef = () => `MLX${Math.floor(1000000 + Math.random() * 9000000)}`;

export const listCustomers = async (
  page: number,
  pageSize: number,
  filters: { status?: string; search?: string },
  requester: { id: string; role: string }
) => {
  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { accountName: { contains: filters.search, mode: 'insensitive' } },
      { barcode: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  // KAM only sees their own handled accounts unless elevated — horizontal scoping.
  if (requester.role === 'KAM') {
    where.handledById = requester.id;
  }

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { contacts: true, handledBy: { select: { name: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return { items, total, page, pageSize };
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
      handledBy: { select: { name: true } },
    },
  });
  if (!customer) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Customer not found' };

  if (requester.role === 'KAM' && customer.handledById !== requester.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have access to this customer record' };
  }
  return customer;
};

export const createRecommendation = async (data: any, kamId: string) => {
  const barcode = generateBarcode();
  const clean = sanitizeAndEscape(data);

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

  await logAudit({ entity: 'Customer', entityId: customer.id, action: 'RECOMMENDATION_CREATED', actorId: kamId, afterState: { barcode } });
  return customer;
};

export const approveRate = async (customerId: string, data: any, lmId: string) => {
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const now = new Date();
  const expiry = new Date(now.getTime() + 21 * 86400000);
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
      rateRef: existing.rateRef || generateRateRef(),
      offerSent: false,
      offerAccepted: false,
      agreementSent: false,
    },
    historyAction: 'RATE APPROVED BY LM — PROVISIONAL CUSTOMER CREATED',
    historySubText: 'Document upload window started (21 days)',
  });
};

export const rejectRate = async (customerId: string, lmId: string) => {
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
  const clean = sanitizeAndEscape({ offerText });
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { offerText: clean.offerText, offerSent: true, offerAccepted: false },
  });
  await prisma.customerHistoryEntry.updateMany({
    where: { customerId, status: 'active' },
    data: { status: 'completed' },
  });
  await prisma.customerHistoryEntry.create({
    data: { customerId, action: 'OFFER LETTER SENT', subText: 'Awaiting customer feedback via KAM', status: 'active' },
  });
  await logAudit({ entity: 'Customer', entityId: customerId, action: 'OFFER_LETTER_SENT', actorId: scId, afterState: { offerSent: true } });
  return updated;
};

export const sendAgreement = async (customerId: string, agreementText: string, scId: string) => {
  const clean = sanitizeAndEscape({ agreementText });
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { agreementText: clean.agreementText, agreementSent: true },
  });
  await prisma.customerHistoryEntry.updateMany({
    where: { customerId, status: 'active' },
    data: { status: 'completed' },
  });
  await prisma.customerHistoryEntry.create({
    data: {
      customerId,
      action: 'AGREEMENT SENT TO CUSTOMER',
      subText: 'Document upload unlocked for KAM',
      status: 'active',
    },
  });
  await logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'AGREEMENT_SENT',
    actorId: scId,
    afterState: { agreementSent: true },
  });
  return updated;
};

export const submitClientFeedback = async (
  customerId: string,
  data: { accepted: boolean; rejectReason?: string },
  kamId: string
) => {
  if (data.accepted) {
    const updated = await prisma.customer.update({ where: { id: customerId }, data: { offerAccepted: true } });
    await prisma.customerHistoryEntry.updateMany({ where: { customerId, status: 'active' }, data: { status: 'completed' } });
    await prisma.customerHistoryEntry.create({
      data: { customerId, action: 'OFFER ACCEPTED BY CUSTOMER', subText: 'Awaiting Sales Coordinator to send the Agreement', status: 'active' },
    });
    await logAudit({ entity: 'Customer', entityId: customerId, action: 'OFFER_ACCEPTED', actorId: kamId, afterState: { offerAccepted: true } });
    return updated;
  }

  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const clean = sanitizeAndEscape({ r: data.rejectReason || '' });
  // Reject re-opens the offer step for the SC to revise and resend — it does
  // NOT go back through Line Manager, matching 2.1.3.1's direct loop to 2.1.4.
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { offerSent: false, offerAccepted: false, rejectReason: clean.r, revision: customer.revision + 1 },
  });
  await prisma.customerHistoryEntry.updateMany({ where: { customerId, status: 'active' }, data: { status: 'completed' } });
  await prisma.customerHistoryEntry.create({
    data: { customerId, action: 'OFFER REJECTED BY CUSTOMER', subText: clean.r, status: 'active' },
  });
  await logAudit({ entity: 'Customer', entityId: customerId, action: 'OFFER_REJECTED', actorId: kamId, afterState: { rejectReason: clean.r } });
  return updated;
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
  const before = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      followUpNote: data.followUpNote ? sanitizeAndEscape({ n: data.followUpNote }).n : undefined,
    },
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

export const deriveFollowUps = async () => {
  const customers = await prisma.customer.findMany({ where: { status: { not: CUSTOMER_STATUS.ACTIVE_ACCOUNT as any } } });
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

export const updateFinalProfile = async (customerId: string, data: any, actorId: string) => {
  const clean = sanitizeAndEscape(data);
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { ...clean, finalProfileCompleted: true },
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