// src/modules/customers/customers.service.ts
import { prisma } from '../../config/db';
import { CUSTOMER_STATUS } from '../../common/constants/status.constant';
import { transitionCustomerStatus, notifyCustomerWorkflowUsers } from '../../common/utils/stateMachine.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { sanitizeAndEscape } from './sanitize.helper';
import { uploadFileToSupabase, deleteFileFromSupabase } from '../file-storage/fileStorage.service';
import { runFileScan } from '../../jobs/file-scan.job';
import { humanizeStatus } from '../../common/utils/humanize.util';
// Used by the creator-skip path to name the role in history entries.
import { ensureServiceProvidersExist } from '../service-providers/serviceProviders.service';
import { assertLineManagerOwnsCustomer, assertKamOwnsCustomerIfKam } from '../../common/utils/scopeGuard.util';
import { assertValidCreditPeriodValue, isCreditPeriodField } from '../../common/utils/creditRules.util';
import { createNotificationsForUsers } from '../notifications/notifications.service';
import { ensureCustomerAccount } from './customerAccount.service';

const generateBarcode = () => `MLX${Math.floor(100000 + Math.random() * 900000)}`;

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



// The named groups the UI actually asks for. Defining them here (instead of
// filtering a fully-downloaded list in the browser) is what lets the client
// hold one page at a time no matter how large the database grows — while
// still reaching every record through search and paging.
const GROUP_FILTERS: Record<string, any> = {
  customer: { status: CUSTOMER_STATUS.ACTIVE_ACCOUNT },
  provisional: {
    accountProfileType: 'PROVISIONAL',
    status: { not: CUSTOMER_STATUS.ACTIVE_ACCOUNT },
  },
  // Everything before the customer has actually said yes. The account only
  // stops being a prospect at the moment they accept the offer — up to then
  // it is a quote being worked on, however far along it looks.
  pending: {
    status: {
      in: [
        CUSTOMER_STATUS.PENDING_RATE_PREPARATION,
        CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
        CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL,
        CUSTOMER_STATUS.PENDING_KAM_RATE_REVIEW,
        CUSTOMER_STATUS.PENDING_LM_RATE_REVIEW,
        CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
        CUSTOMER_STATUS.DRAFTING_OFFER_LETTER,
        CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK,
        CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE,
      ],
    },
  },
  pipeline: { status: { not: CUSTOMER_STATUS.ACTIVE_ACCOUNT } },
};

// Mirrors exactly what the dashboard's "Action Required Queue" used to
// compute in the browser, so the numbers and rows are identical.
const roleQueueFilter = (role: string): any | null => {
  switch (role) {
    case 'SALES_COORDINATOR':
      return {
        OR: [
          { status: CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER },
          { status: CUSTOMER_STATUS.PROVISIONAL_ACTIVE, offerRejected: false, offerAccepted: true, agreementSent: false },
        ],
      };
    case 'LINE_MANAGER':
      return {
        OR: [
          { status: CUSTOMER_STATUS.PROVISIONAL_ACTIVE, offerRejected: true },
          {
            status: {
              in: [
                CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
                CUSTOMER_STATUS.PENDING_LM_RATE_REVIEW,
                CUSTOMER_STATUS.INFO_UPDATE_PENDING_LM_APPROVAL,
                CUSTOMER_STATUS.PROVISIONAL_EXTENSION_REQUESTED,
                CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE,
              ],
            },
          },
        ],
      };
    // Only escalations reach the Head of Department's queue. Everything else
    // in the department is visible to them, but visible is not the same as
    // waiting on them.
    // Escalated rates, and every account waiting to be activated. Those are
    // the two things that genuinely stop without them.
    case 'HEAD_OF_DEPARTMENT':
      return {
        status: {
          in: [
            CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL,
            CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
          ],
        },
      };
    case 'KAM':
      return {
        OR: [
          { status: CUSTOMER_STATUS.PENDING_KAM_RATE_REVIEW },
          { status: CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK },
          { status: CUSTOMER_STATUS.PROVISIONAL_ACTIVE, offerSent: true, offerAccepted: false },
        ],
      };
    default:
      return null;
  }
};

// Everything is composed under a single AND array. The previous version
// assigned `where.OR` for search, which silently collided with any other
// clause that also needed an OR (the role queues all do).
const buildCustomerWhere = (
  filters: { status?: string; search?: string; group?: string },
  requester: { id: string; role: string }
) => {
  const and: any[] = [{ isDeleted: false }];

  // KAM only sees their own handled accounts unless elevated — horizontal scoping.
  // HEAD_OF_DEPARTMENT and SUPER_ADMIN are not narrowed at all — everyone in
  // the department reports up to them, so every record is theirs to see.
  if (requester.role === 'KAM') {
    and.push({ handledById: requester.id });
  } else if (requester.role === 'LINE_MANAGER') {
    // Staff with no Line Manager assigned yet are visible to every Line
    // Manager — the same fallback the notification layer uses, so a record
    // can never become invisible (and therefore unactionable) to everyone.
    and.push({ handledBy: { OR: [{ lineManagerId: requester.id }, { lineManagerId: null }] } });
  }

  if (filters.status) and.push({ status: filters.status });

  if (filters.search) {
    // Strip a "REF-" prefix and any "-R2" revision suffix if the user pasted
    // the full formatted reference badge (e.g. "REF-MLX1707581-R2") instead
    // of just the raw code.
    const cleaned = filters.search.replace(/^REF-/i, '').replace(/-R\d+$/i, '');
    and.push({
      OR: [
        { accountName: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { rateRef: { contains: cleaned, mode: 'insensitive' } },
      ],
    });
  }

  return and;
};

export const listCustomers = async (
  page: number,
  pageSize: number,
  filters: { status?: string; search?: string; group?: string; withCounts?: boolean },
  requester: { id: string; role: string }
) => {
  const baseAnd = buildCustomerWhere(filters, requester);

  const scopedAnd = [...baseAnd];
  if (filters.group === 'queue') {
    const queue = roleQueueFilter(requester.role);
    // A role with no queue of its own (Super Admin) gets an empty result
    // rather than everything — same behaviour the dashboard always had.
    scopedAnd.push(queue ?? { id: { in: [] } });
  } else if (filters.group && GROUP_FILTERS[filters.group]) {
    scopedAnd.push(GROUP_FILTERS[filters.group]);
  }

  const where: any = { AND: scopedAnd };

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
        rateRef: true, offerSent: true, offerAccepted: true, offerRejected: true, agreementSent: true,
        finalProfileCompleted: true, accountConfigMode: true,
        managingPartnerName: true, managingPartnerDesignation: true,
        binNumber: true, tinNumber: true, preferredCarrier: true, natureOfBusiness: true,
        gainType: true, financeMode: true, area: true, zone: true,
        revision: true, status: true, accountProfileType: true,
        provisionalCreatedAt: true, provisionalExpiryDate: true, provisionalExtensionDays: true,
        followUpDate: true, followUpNote: true,
        recommendedById: true, handledById: true,
        createdAt: true, updatedAt: true,
        handledBy: { select: { name: true } },
        // The assignments view names who raised the account, not just who
        // holds it now.
        recommendedBy: { select: { name: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  // The tab badges and dashboard tiles need totals for groups other than the
  // one being displayed. They are counted in the database — cheap, indexed
  // COUNT queries — instead of by measuring a fully downloaded array.
  let counts: Record<string, number> | undefined;
  if (filters.withCounts) {
    const countFor = (extra?: any) =>
      prisma.customer.count({ where: { AND: extra ? [...baseAnd, extra] : baseAnd } });
    const queue = roleQueueFilter(requester.role);
    const [all, customer, provisional, pending, pipeline, queueCount] = await Promise.all([
      countFor(),
      countFor(GROUP_FILTERS.customer),
      countFor(GROUP_FILTERS.provisional),
      countFor(GROUP_FILTERS.pending),
      countFor(GROUP_FILTERS.pipeline),
      queue ? countFor(queue) : Promise.resolve(0),
    ]);
    counts = { all, customer, provisional, pending, pipeline, queue: queueCount };
  }

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    counts,
  };
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
      handledBy: { select: { id: true, name: true, lineManagerId: true } },
      // Who raised the recommendation in the first place. It survives every
      // later handover, which is exactly why it is worth showing.
      recommendedBy: { select: { id: true, name: true } },
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

// Whoever creates a recommendation has already made their own decision on it
// by filling it in, so their approval step would only be them confirming a
// value they just typed. These roles set the rate at creation time instead.
export const SELF_APPROVING_ROLES = ['LINE_MANAGER', 'HEAD_OF_DEPARTMENT', 'SUPER_ADMIN'];

export const createRecommendation = async (data: any, kamId: string, creatorRole = 'KAM') => {
  const clean = sanitizeAndEscape(data);
  // A cash account carries no credit terms, so there is nothing to validate
  // and nothing to store.
  const isCash = clean.accountType === 'CASH';
  if (!isCash && clean.creditPeriodDays) {
    assertValidCreditPeriodValue(clean.creditPeriodDays);
  }
  const barcode = await generateUniqueBarcode();
  const selfApproves = SELF_APPROVING_ROLES.includes(creatorRole);
  const rateSource = creatorRole === 'LINE_MANAGER' ? 'LINE_MANAGER' : 'HEAD_OF_DEPARTMENT';
  // Whoever set the rate at creation still does not push it at the customer:
  // the KAM who owns the relationship gets the same say they would have had.

  const customer = await prisma.customer.create({
    data: {
      barcode,
      createdByRole: creatorRole as any,
      // The rate reference is derived from the customer's own id, so it stays
      // the same for the life of the account and only the revision suffix
      // moves. See buildRateRef().
      ...(selfApproves
        ? {
            rateRef: barcode,
            approvedRate: clean.proposedRate,
            rateSource: rateSource as any,
            rateSetById: kamId,
            // Their own rate needs no further sign-off, so it goes straight
            // out for an offer letter.
            status: CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER as any,
          }
        : {}),
      accountName: clean.accountName,
      address: clean.address,
      phone: clean.phone || '',
      email: clean.email,
      businessType: clean.businessType,
      serviceRequired: clean.serviceRequired,
      accountMode: clean.accountMode,
      accountType: clean.accountType,
      creditLimitTk: isCash ? null : clean.creditLimitTk,
      creditPeriodDays: isCash ? null : clean.creditPeriodDays || '15',
      creditPeriodExtendedByLM: false,
      proposedRate: clean.proposedRate,
      recNote: clean.recNote,
      ...(selfApproves ? {} : { status: CUSTOMER_STATUS.PENDING_RATE_APPROVAL as any }),
      recommendedById: kamId,
      handledById: kamId,
      contacts: { create: data.contacts },
      shippingDetails: { create: data.shippingDetails },
      history: {
        create: selfApproves
          ? {
              action: `RECOMMENDATION CREATED AND RATE SET BY ${humanizeStatus(creatorRole).toUpperCase()}`,
              subText: 'Awaiting Sales Coordinator to send the offer letter',
              status: 'active',
            }
          : { action: 'RECOMMENDATION FORM CREATED BY KAM', status: 'active' },
      },
    },
    include: { contacts: true, shippingDetails: true },
  });

  // The opening entry in the chain: the account starts with whoever created
  // it, so a later handover has something to be a handover *from*.
  recordAssignment({
    customerId: customer.id,
    assignedToId: kamId,
    previousId: null,
    assignedById: kamId,
    assignedByRole: creatorRole,
    reason: 'CREATED',
  }).catch(() => {});

  logAudit({ entity: 'Customer', entityId: customer.id, action: 'RECOMMENDATION_CREATED', actorId: kamId, afterState: { barcode } }).catch(() => {});

  // Notify every active Line Manager that a new recommendation needs rate
  // approval — persisted so it shows up in their notification bell/page,
  // not just a silent socket ping.
  // Scoped to this KAM's own Line Manager; only falls back to every LM when
  // the KAM has not been assigned one yet.
  if (selfApproves) {
    // The rate is set and signed off in the same act, so the only person
    // waiting is the Sales Coordinator.
    prisma.user
      .findMany({ where: { role: { name: 'SALES_COORDINATOR' }, isActive: true }, select: { id: true } })
      .then((scs) =>
        createNotificationsForUsers(scs.map((s) => s.id), {
          label: `${customer.accountName} — Rate set, please send the offer letter`,
          link: `/app/customers/${barcode}`,
        })
      )
      .catch(() => {});
  } else {
    const kam = await prisma.user.findUnique({ where: { id: kamId }, select: { lineManagerId: true } });
    const lineManagers = kam?.lineManagerId
      ? [{ id: kam.lineManagerId }]
      : await prisma.user.findMany({ where: { role: { name: 'LINE_MANAGER' }, isActive: true }, select: { id: true } });
    createNotificationsForUsers(
      lineManagers.map((lm) => lm.id),
      { label: `${customer.accountName} — New recommendation submitted, needs rate approval`, link: `/app/customers/${barcode}` },
    ).catch(() => {});
  }



  // Persist any new "Others" carrier name(s) typed in this submission so
  // they show up as normal dropdown options on every future recommendation
  // form. Providers can be a comma-separated multi-select value.
  const providerNames = (data.shippingDetails || [])
    .flatMap((s: any) => (s.provider || '').split(',').map((p: string) => p.trim()))
    .filter(Boolean);
  ensureServiceProvidersExist(providerNames).catch(() => {});

  return customer;
};

// Notifies only the Head of Department. Used when a Line Manager escalates:
// nobody else is being asked for anything at that point, so telling the KAM
// would be telling them about a decision they cannot influence.
export const notifyHeadsOfDepartment = async (label: string, link: string) => {
  try {
    const hods = await prisma.user.findMany({
      where: { role: { name: 'HEAD_OF_DEPARTMENT' }, isActive: true },
      select: { id: true },
    });
    if (hods.length === 0) return;
    await createNotificationsForUsers(hods.map((h) => h.id), { label, link });
  } catch (err) {
    console.warn('[notifications] notifyHeadsOfDepartment failed (non-fatal):', (err as Error)?.message);
  }
};

const rateSourceFor = (role: string) =>
  role === 'HEAD_OF_DEPARTMENT' || role === 'SUPER_ADMIN' ? 'HEAD_OF_DEPARTMENT' : 'LINE_MANAGER';

// Where a freshly-set rate goes next depends entirely on who owns the
// account. A KAM raised it, so a KAM reviews it. A Line Manager raised it
// themselves and has nobody below to hand it to, so it goes straight out for
// an offer letter — pausing for their own approval of their own decision is
// a step that means nothing. The Head of Department works the same way.
const nextStopAfterRate = (createdByRole: string | null | undefined, setByRole: string) => {
  const owner = createdByRole || 'KAM';
  if (owner === 'KAM' || owner === 'SALES_COORDINATOR') {
    return CUSTOMER_STATUS.PENDING_KAM_RATE_REVIEW;
  }
  // The Line Manager owns it. If the rate came back from the Head of
  // Department they still get to look before it goes out; if they set it
  // themselves there is nothing left to look at.
  if (owner === 'LINE_MANAGER') {
    return setByRole === 'HEAD_OF_DEPARTMENT'
      ? CUSTOMER_STATUS.PENDING_LM_RATE_REVIEW
      : CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER;
  }
  // The Head of Department owns it — their own rate needs no further sign-off.
  return CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER;
};

// Where a rejected offer goes back to. The Head of Department answers their
// own accounts directly, because there is nobody above them to escalate to.
const rateDeskFor = (createdByRole: string | null | undefined) =>
  createdByRole === 'HEAD_OF_DEPARTMENT' || createdByRole === 'SUPER_ADMIN'
    ? CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL
    : CUSTOMER_STATUS.PENDING_RATE_APPROVAL;

// Keeps the superseded rate, with the reference and the authority behind it,
// so the sequence stays readable however many rounds it takes.
const buildRateHistoryEntry = (customer: any, reason?: string) => ({
  rate: customer.approvedRate || customer.proposedRate || '',
  rateRef: customer.rateRef || '',
  source: customer.rateSource || null,
  changedAt: new Date().toISOString(),
  reason: reason || '',
});

// The Line Manager (or the Head of Department answering an escalation) sets
// the rate. It does NOT go to the customer yet — the KAM sees it first and
// decides whether to run with it, which is the step that was missing.
export const approveRate = async (customerId: string, data: any, actorId: string, actorRole = 'LINE_MANAGER') => {
  await assertLineManagerOwnsCustomer(customerId, actorId);
  if (data.creditPeriodDays !== undefined && data.creditPeriodDays !== null && data.creditPeriodDays !== '') {
    assertValidCreditPeriodValue(data.creditPeriodDays);
  }
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const clean = sanitizeAndEscape({ rate: data.approvedRate, note: data.lmNote || '' });
  // The reference is the customer's own id, fixed for the life of the
  // account — only the revision suffix moves as the rate changes.
  const rateRef = existing.rateRef || existing.barcode;
  const source = rateSourceFor(actorRole);
  const isRevision = !!existing.approvedRate;
  const nextStatus = nextStopAfterRate(existing.createdByRole, source);

  const updated = await transitionCustomerStatus({
    customerId,
    toStatus: nextStatus,
    actorId,
    extraUpdates: {
      approvedRate: clean.rate,
      rateSource: source,
      rateSetById: actorId,
      lmNote: clean.note || null,
      creditPeriodDays: data.creditPeriodDays || existing.creditPeriodDays,
      creditPeriodExtendedByLM: !!data.creditPeriodExtendedByLM,
      rateRef,
      ...(isRevision
        ? { revision: existing.revision + 1, rateHistory: { push: buildRateHistoryEntry(existing) } }
        : {}),
      offerSent: false,
      offerAccepted: false,
      offerRejected: false,
      rejectReason: null,
    },
    historyAction: `RATE SET BY ${source === 'HEAD_OF_DEPARTMENT' ? 'HEAD OF DEPARTMENT' : 'LINE MANAGER'}`,
    historySubText:
      nextStatus === CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER
        ? 'Awaiting the Sales Coordinator to send the offer letter'
        : 'Awaiting review before it goes to the customer',
    skipWorkflowNotification: true,
    // Straight to the Sales Coordinator means it is their turn now.
    notifySalesCoordinators: nextStatus === CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
  });

  createNotificationsForUsers([updated.handledById], {
    label: `${updated.accountName} — Rate set by ${source === 'HEAD_OF_DEPARTMENT' ? 'Head of Department' : 'Line Manager'}: ${clean.rate}`,
    link: `/app/customers/${updated.barcode}`,
  }).catch(() => {});

  return updated;
};

// The Line Manager passes the decision up. Only the Head of Department hears
// about it, and only now — not when the recommendation first arrived.
export const escalateRateToHod = async (customerId: string, reason: string, lmId: string) => {
  await assertLineManagerOwnsCustomer(customerId, lmId);
  const clean = sanitizeAndEscape({ reason });

  const updated = await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL,
    actorId: lmId,
    extraUpdates: { lmNote: clean.reason },
    historyAction: 'BEST RATE REQUESTED FROM HEAD OF DEPARTMENT',
    historySubText: clean.reason,
    // Only the Head of Department is told, below. The KAM hears nothing
    // until an answer exists — being notified of a question they cannot
    // influence just produces noise and premature conversations.
    skipWorkflowNotification: true,
  });

  await prisma.rateRequest.create({
    data: {
      customerId,
      requestedById: lmId,
      requestedByRole: 'LINE_MANAGER',
      reason: clean.reason,
    },
  });

  notifyHeadsOfDepartment(
    `${updated.accountName} — A best rate has been requested by the Line Manager`,
    `/app/customers/${updated.barcode}`
  ).catch(() => {});

  return updated;
};

// The Head of Department answers. One field, one decision: the rate.
export const grantHodRate = async (
  customerId: string,
  data: { approvedRate: string; lmNote?: string },
  hodId: string,
  actorRole = 'HEAD_OF_DEPARTMENT'
) => {
  if (!['HEAD_OF_DEPARTMENT', 'SUPER_ADMIN'].includes(actorRole)) {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the Head of Department can set the best rate on an escalated request.',
    };
  }
  const existing = await prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
  const clean = sanitizeAndEscape({ rate: data.approvedRate, note: data.lmNote || '' });
  const isRevision = !!existing.approvedRate;
  const nextStatus = nextStopAfterRate(existing.createdByRole, 'HEAD_OF_DEPARTMENT');

  const updated = await transitionCustomerStatus({
    customerId,
    toStatus: nextStatus,
    actorId: hodId,
    extraUpdates: {
      approvedRate: clean.rate,
      rateSource: 'HEAD_OF_DEPARTMENT',
      rateSetById: hodId,
      lmNote: clean.note || null,
      rateRef: existing.rateRef || existing.barcode,
      ...(isRevision
        ? { revision: existing.revision + 1, rateHistory: { push: buildRateHistoryEntry(existing) } }
        : {}),
      offerSent: false,
      offerAccepted: false,
      offerRejected: false,
      rejectReason: null,
    },
    historyAction: 'BEST RATE SET BY HEAD OF DEPARTMENT',
    historySubText:
      nextStatus === CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER
        ? 'Awaiting the Sales Coordinator to send the offer letter'
        : 'Awaiting review before it goes to the customer',
    // The notification below names the rate and who set it, which is what
    // people actually need — the generic one would only repeat the heading.
    skipWorkflowNotification: true,
    notifySalesCoordinators: nextStatus === CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
  });

  // The open escalation is closed out with the answer it received.
  await prisma.rateRequest.updateMany({
    where: { customerId, approved: null },
    data: {
      approved: true,
      grantedRate: clean.rate,
      grantedNote: clean.note || null,
      grantedById: hodId,
      grantedByRole: 'HEAD_OF_DEPARTMENT',
      grantedAt: new Date(),
    },
  });

  // Now everyone hears about it — this is the first point at which the
  // answer exists.
  notifyCustomerWorkflowUsers(
    updated.handledById,
    {
      label: `${updated.accountName} — Best rate set by Head of Department: ${clean.rate}`,
      link: `/app/customers/${updated.barcode}`,
    },
    hodId
  ).catch(() => {});

  return updated;
};

// Whoever holds the account takes the rate forward — a KAM normally, a Line
// Manager when it is theirs. Nothing has reached the customer until now.
export const sendRateToSalesCoordinator = async (customerId: string, actorId: string, actorRole: string) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER,
    actorId,
    historyAction: 'RATE ACCEPTED BY KAM — SENT FOR OFFER LETTER',
    historySubText: 'Awaiting the Sales Coordinator to send the offer letter',
    notifySalesCoordinators: true,
  });
};

// The KAM sends it back. It always goes to their own Line Manager first, who
// decides whether to answer it or take it up to the Head of Department.
export const kamRequestBetterRate = async (
  customerId: string,
  reason: string,
  actorId: string,
  actorRole: string
) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  const clean = sanitizeAndEscape({ reason });
  const existing = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { createdByRole: true },
  });
  // A Line Manager asking for better goes straight to the Head of
  // Department; there is no intermediate desk between them.
  const isLineManagerOwned = existing.createdByRole === 'LINE_MANAGER';
  const toStatus = isLineManagerOwned
    ? CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL
    : CUSTOMER_STATUS.PENDING_RATE_APPROVAL;

  const updated = await transitionCustomerStatus({
    customerId,
    toStatus,
    actorId,
    extraUpdates: isLineManagerOwned ? { lmNote: clean.reason } : {},
    historyAction: isLineManagerOwned
      ? 'BEST RATE REQUESTED FROM HEAD OF DEPARTMENT'
      : 'BETTER RATE REQUESTED BY KAM',
    historySubText: clean.reason,
    skipWorkflowNotification: isLineManagerOwned,
  });

  if (isLineManagerOwned) {
    notifyHeadsOfDepartment(
      `${updated.accountName} — A best rate has been requested by the Line Manager`,
      `/app/customers/${updated.barcode}`
    ).catch(() => {});
  }

  await prisma.rateRequest.create({
    data: {
      customerId,
      requestedById: actorId,
      requestedByRole: actorRole as any,
      reason: clean.reason,
    },
  });

  return updated;
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

export const finalizeOffer = async (
  customerId: string,
  offerText: string,
  scId: string,
  sentVia?: string
) => {
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
      select: { status: true, isDeleted: true, offerRejected: true },
    });
    if (!current || current.isDeleted) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    }
    const canSendOffer =
      current.status === CUSTOMER_STATUS.RATE_APPROVED_PENDING_OFFER ||
      current.status === CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK ||
      // A live provisional account being re-quoted stays provisional.
      current.status === CUSTOMER_STATUS.PROVISIONAL_ACTIVE;
    if (!canSendOffer) {
      throw {
        statusCode: 409,
        code: 'INVALID_STATE',
        message: `The offer letter can't be sent right now (current status: ${humanizeStatus(current.status)}).`,
      };
    }
    if (current.offerRejected) {
      throw {
        statusCode: 409,
        code: 'AWAITING_NEW_RATE',
        message: 'The customer rejected the last offer. The Line Manager must approve a new rate before another offer can be sent.',
      };
    }
    const customer = await tx.customer.update({
      where: { id: customerId },
      data: {
        offerText: clean.offerText,
        offerSent: true,
        offerAccepted: false,
        offerRejected: false,
        status: CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK as any,
      },
      include: CUSTOMER_WITH_HANDLER,
    });

    // Every letter ever sent is kept as its own numbered copy. The customer
    // record only carries the latest text, so without this an earlier version
    // — and the rate it quoted — would be gone the moment a revision went out.
    const sentCount = await tx.customerCorrespondence.count({
      where: { customerId, kind: 'OFFER_LETTER' },
    });
    await tx.customerCorrespondence.create({
      data: {
        customerId,
        kind: 'OFFER_LETTER',
        copyNumber: sentCount + 1,
        body: clean.offerText,
        rateRef: customer.rateRef,
        rateAtSend: customer.approvedRate || customer.proposedRate,
        sentById: scId,
        sentVia: sentVia || null,
      },
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

export const sendAgreement = async (
  customerId: string,
  agreementText: string,
  scId: string,
  sentVia?: string
) => {
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

    const sentCount = await tx.customerCorrespondence.count({
      where: { customerId, kind: 'AGREEMENT' },
    });
    await tx.customerCorrespondence.create({
      data: {
        customerId,
        kind: 'AGREEMENT',
        copyNumber: sentCount + 1,
        body: clean.agreementText,
        rateRef: customer.rateRef,
        rateAtSend: customer.approvedRate || customer.proposedRate,
        sentById: scId,
        sentVia: sentVia || null,
      },
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
  kamId: string,
  actorRole = 'KAM'
) => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
  if (data.accepted) {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({
        where: { id: customerId },
        select: {
          status: true,
          isDeleted: true,
          offerSent: true,
          offerAccepted: true,
          offerRejected: true,
          provisionalCreatedAt: true,
        },
      });
      if (!current || current.isDeleted) {
        throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
      }
      if (!current.offerSent) {
        throw {
          statusCode: 409,
          code: 'INVALID_STATE',
          message: 'Customer feedback can only be recorded after an offer letter has been sent.',
        };
      }
      if (current.offerAccepted || current.offerRejected) {
        throw {
          statusCode: 409,
          code: 'FEEDBACK_ALREADY_RECORDED',
          message: 'The customer\'s answer to this offer has already been recorded. Please refresh the page.',
        };
      }
      // The provisional countdown starts here, on the customer's acceptance —
      // this is the first moment the agreement and its supporting documents
      // are actually owed. If a previous offer had already started it, the
      // original start date is kept rather than silently extended.
      const now = new Date();
      const startsNow = !current.provisionalCreatedAt;
      const customer = await tx.customer.update({
        where: { id: customerId },
        data: {
          offerAccepted: true,
          // Accepting is what makes the account provisional. Until this
          // moment it was a quote, not a customer.
          status: CUSTOMER_STATUS.PROVISIONAL_ACTIVE as any,
          accountProfileType: 'PROVISIONAL' as any,
          ...(startsNow
            ? {
                provisionalCreatedAt: now,
                provisionalExpiryDate: new Date(now.getTime() + 21 * 86400000),
              }
            : {}),
        },
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

  const clean = sanitizeAndEscape({ r: data.rejectReason || '' });

  // A rejection routes back through the Line Manager for a fresh approved
  // rate — the Sales Coordinator cannot resend without that re-approval.
  //
  // Crucially the status stays PROVISIONAL_ACTIVE rather than moving to
  // OFFER_REJECTED_REVISE_RATE. Moving it stopped the 21-day document
  // countdown and dropped the account out of the provisional view, when in
  // reality the provisional period is still running and only the offer is
  // in question. The `offerRejected` flag carries that meaning instead.
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.customer.findUnique({
      where: { id: customerId },
      select: {
        status: true,
        isDeleted: true,
        offerSent: true,
        offerAccepted: true,
        offerRejected: true,
        revision: true,
        accountProfileType: true,
        createdByRole: true,
      },
    });
    if (!current || current.isDeleted) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    }
    if (!current.offerSent) {
      throw {
        statusCode: 409,
        code: 'INVALID_STATE',
        message: 'Customer feedback can only be recorded after an offer letter has been sent.',
      };
    }
    // Feedback is a one-time answer per offer. Recording a second one would
    // silently overwrite the first and push the account down a path nobody
    // chose, so it is refused rather than applied.
    if (current.offerAccepted || current.offerRejected) {
      throw {
        statusCode: 409,
        code: 'FEEDBACK_ALREADY_RECORDED',
        message: 'The customer\'s answer to this offer has already been recorded. Please refresh the page.',
      };
    }

    const customer = await tx.customer.update({
      where: { id: customerId },
      data: {
        offerSent: false,
        offerAccepted: false,
        offerRejected: true,
        rejectReason: clean.r,
        revision: current.revision + 1,
        // Straight back to the Line Manager, who runs the same decision
        // again — set a rate, or take it up to the Head of Department.
        //
        // An account that is already provisional keeps that standing and the
        // countdown already running against it: the customer is a customer,
        // only the rate is back in question. Everything earlier in the flow
        // returns to the Line Manager's desk properly.
        ...(current.status === CUSTOMER_STATUS.PROVISIONAL_ACTIVE
          ? {}
          : { status: CUSTOMER_STATUS.PENDING_RATE_APPROVAL as any }),
      },
      include: CUSTOMER_WITH_HANDLER,
    });

    await tx.customerHistoryEntry.updateMany({ where: { customerId, status: 'active' }, data: { status: 'completed' } });
    await tx.customerHistoryEntry.create({
      data: {
        customerId,
        action: 'OFFER REJECTED BY CUSTOMER',
        subText: clean.r ? `${clean.r} — back to the Line Manager for a new rate` : 'Back to the Line Manager for a new rate',
        status: 'active',
      },
    });

    return customer;
  });

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'OFFER_REJECTED',
    actorId: kamId,
    afterState: { offerRejected: true, revision: updated.revision },
  }).catch(() => {});

  // Goes to the Line Manager (and the KAM's own record), not to the Sales
  // Coordinators — nothing is theirs to do until a new rate is approved.
  notifyCustomerWorkflowUsers(
    updated.handledById,
    { label: `${updated.accountName} — Customer rejected the offer, a new rate is needed`, link: `/app/customers/${updated.barcode}` },
    kamId,
  ).catch(() => {});

  // On an account the Head of Department owns, the decision is theirs — the
  // usual workflow audience does not include them.
  if (rateDeskFor(updated.createdByRole) === CUSTOMER_STATUS.PENDING_HOD_RATE_APPROVAL) {
    notifyHeadsOfDepartment(
      `${updated.accountName} — Customer rejected the offer, a new rate is needed`,
      `/app/customers/${updated.barcode}`
    ).catch(() => {});
  }

  return updated;
};

// The account never left PROVISIONAL_ACTIVE when the offer was rejected, so
// there is no status change to make here — only the rejection flag to clear
// and a new approved rate to record. Everything commits together.
export const reapproveRateAfterRejection = async (
  customerId: string,
  approvedRate: string,
  lmNote: string | undefined,
  lmId: string,
  actorRole = 'LINE_MANAGER',
) => {
  await assertLineManagerOwnsCustomer(customerId, lmId);
  const clean = sanitizeAndEscape({ approvedRate, lmNote: lmNote || '' });
  const source = actorRole === 'HEAD_OF_DEPARTMENT' || actorRole === 'SUPER_ADMIN'
    ? 'HEAD_OF_DEPARTMENT'
    : 'LINE_MANAGER';

  const updated = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.isDeleted) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'We couldn\'t find that customer. It may have been removed.' };
    }
    // Legacy records created before this change may still be sitting in
    // OFFER_REJECTED_REVISE_RATE, so both are accepted here.
    const isRejectedProvisional = customer.status === CUSTOMER_STATUS.PROVISIONAL_ACTIVE && customer.offerRejected;
    const isLegacyRejected = customer.status === CUSTOMER_STATUS.OFFER_REJECTED_REVISE_RATE;
    if (!isRejectedProvisional && !isLegacyRejected) {
      throw {
        statusCode: 409,
        code: 'INVALID_STATE',
        message: 'A new rate can only be approved for an account where the customer has rejected the offer.',
      };
    }

    const previousEntry = {
      rate: customer.approvedRate || customer.proposedRate || '',
      rateRef: customer.rateRef || '',
      source: customer.rateSource || null,
      changedAt: new Date().toISOString(),
      reason: customer.rejectReason || 'Rejected by customer',
    };

    const result = await tx.customer.update({
      where: { id: customerId },
      data: {
        approvedRate: clean.approvedRate,
        rateSource: source as any,
        rateSetById: lmId,
        lmNote: clean.lmNote || null,
        // The reference itself never changes — only the revision counter does,
        // which is what produces REF-MLX…-R1, -R2 and so on.
        revision: { increment: 1 },
        rejectReason: null,
        offerRejected: false,
        offerSent: false,
        offerAccepted: false,
        // A legacy record is pulled back into the provisional flow.
        ...(isLegacyRejected ? { status: CUSTOMER_STATUS.PROVISIONAL_ACTIVE as any } : {}),
        rateHistory: { push: previousEntry },
      },
      include: CUSTOMER_WITH_HANDLER,
    });

    await tx.customerHistoryEntry.updateMany({ where: { customerId, status: 'active' }, data: { status: 'completed' } });
    await tx.customerHistoryEntry.create({
      data: {
        customerId,
        action: `NEW RATE APPROVED BY ${source === 'HEAD_OF_DEPARTMENT' ? 'HOD' : 'LM'}`,
        subText: 'Awaiting Sales Coordinator to send the revised offer letter',
        status: 'active',
      },
    });

    return result;
  });

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'RATE_REAPPROVED_AFTER_REJECTION',
    actorId: lmId,
    afterState: { approvedRate: clean.approvedRate, source },
  }).catch(() => {});

  // Now it genuinely is the Sales Coordinator's turn again.
  notifyCustomerWorkflowUsers(
    updated.handledById,
    { label: `${updated.accountName} — New rate approved, please resend the offer letter`, link: `/app/customers/${updated.barcode}` },
    lmId,
    { includeSalesCoordinators: true },
  ).catch(() => {});

  return updated;
};

export const reviseRateAfterRejection = async (customerId: string, proposedRate: string, kamId: string, actorRole = 'KAM') => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
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
export const activateAsProvisional = async (customerId: string, kamId: string, actorRole = 'KAM') => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
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

export const activateDirectly = async (customerId: string, kamId: string, actorRole = 'KAM') => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
  const updated = await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.ACTIVE_ACCOUNT,
    actorId: kamId,
    historyAction: 'AGREEMENT SIGNED — ACCOUNT ACTIVATED',
  });
  ensureCustomerAccount(customerId).catch(() => {});
  return updated;
};

export const requestInfoUpdate = async (
  customerId: string,
  field: string,
  newValue: string,
  kamId: string,
  actorRole = 'KAM'
) => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
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
  // HEAD_OF_DEPARTMENT and SUPER_ADMIN see the whole department, unfiltered.

  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ followUpDate: 'asc' }, { createdAt: 'desc' }],
    // No cap: every pipeline account this person is allowed to see appears
    // here. The column selection below is already narrow, so the payload
    // stays small even with thousands of rows.
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
// Only the trade licence gates onboarding now. The rest are captured when
// they exist but never block a customer from going active, because in
// practice they arrive on the customer's own schedule.
const REQUIRED_FINAL_DOC_TYPES = ['TRADE_LICENSE'];

export const submitFinalOnboardingRegular = async (customerId: string, actorId: string, actorRole: string) => {
  await assertKamOwnsCustomerIfKam(customerId, actorId, actorRole);
  const customer = await prisma.customer.findUniqueOrThrow({ where: { id: customerId }, include: { documents: true } });
  // When the case was created by someone whose own approval this would be,
  // there is nobody left to review it — submitting is the decision.
  const selfOwned = SELF_APPROVING_ROLES.includes(customer.createdByRole || '');
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

  if (selfOwned) {
    const activated = await transitionCustomerStatus({
      customerId,
      toStatus: CUSTOMER_STATUS.ACTIVE_ACCOUNT,
      actorId,
      extraUpdates: { accountProfileType: 'REGULAR' },
      historyAction: 'FINAL ONBOARDING COMPLETED — ACCOUNT ACTIVATED',
      historySubText: `Review skipped: created by ${humanizeStatus(customer.createdByRole || '')}`,
    });
    ensureCustomerAccount(customerId).catch(() => {});
    return activated;
  }

  const submitted = await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
    actorId,
    extraUpdates: { accountProfileType: 'REGULAR' },
    historyAction: 'FINAL ONBOARDING REQUESTED (REGULAR ACCOUNT)',
    historySubText: 'Awaiting Head of Department approval',
  });

  notifyHeadsOfDepartment(
    `${submitted.accountName} — Onboarding complete, ready for activation`,
    `/app/customers/${submitted.barcode}`
  ).catch(() => {});

  return submitted;
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
    options: [{ value: 'IB', label: 'IB' }, { value: 'OB', label: 'OB' }, { value: 'BOTH', label: 'IB & OB' }],
  },
  accountMode: {
    label: 'Account Mode', type: 'select',
    // 'Fair' kept as a selectable option only so any customer still carrying
    // the old value can be edited without the dropdown showing blank; new
    // selections should use 'Freight'.
    options: [
      { value: 'Express', label: 'Express' },
      { value: 'Freight', label: 'Freight' },
      { value: 'Express & Freight', label: 'Express & Freight' },
      { value: 'Fair', label: 'Fair (legacy)' },
    ],
  },
  accountType: {
    label: 'Account Type', type: 'select',
    options: [{ value: 'CREDIT CUSTOMER', label: 'Credit Customer' }, { value: 'CASH', label: 'Cash' }],
  },
  creditLimitTk: { label: 'Credit Limit (TK)', type: 'number' },
  creditPeriodDays: { label: 'Credit Period (Days)', type: 'number' },
  managingPartnerName: { label: 'Managing Partner', type: 'text' },
  managingPartnerDesignation: {
    label: 'Managing Partner Designation', type: 'select',
    options: ['MD', 'MP', 'Director', 'Proprietor'].map((v) => ({ value: v, label: v })),
  },
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
  SIGNED_OFFER_LETTER: 'Signed Offer Letter',
  // Retired category — the label stays so older uploads still read properly.
  OFFER_RATE_RECEIPT: 'Offer & Rate Receipt',
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
          await tx.customer.update({
            where: { id: request.customerId },
            data: {
              approvedRate: request.newValue,
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

// Every handover is written down as it happens, including the very first one
// at creation. The Customer row only ever carries whoever holds it now, so
// without this the previous holder — and the fact a handover happened at all
// — disappears the moment it does.
const recordAssignment = async (params: {
  customerId: string;
  assignedToId: string;
  previousId?: string | null;
  assignedById: string;
  assignedByRole?: string;
  reason: 'CREATED' | 'REASSIGNED';
  note?: string;
}) => {
  try {
    await prisma.customerAssignment.create({
      data: {
        customerId: params.customerId,
        assignedToId: params.assignedToId,
        previousId: params.previousId ?? null,
        assignedById: params.assignedById,
        assignedByRole: (params.assignedByRole as any) ?? null,
        reason: params.reason,
        note: params.note ?? null,
      },
    });
  } catch (err) {
    // The handover itself has already committed; losing the note of it is
    // regrettable but must not undo the change the person just made.
    console.warn('[assignment] Could not record the handover (non-fatal):', (err as Error)?.message);
  }
};

export const listAssignmentHistory = async (
  customerId: string,
  requester: { id: string; role: string }
) => {
  await assertKamOwnsCustomerIfKam(customerId, requester.id, requester.role);
  if (requester.role === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, requester.id);
  }

  const rows = await prisma.customerAssignment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  });
  if (rows.length === 0) return [];

  // One lookup for every name the list needs, rather than a join per row.
  const ids = [
    ...new Set(
      rows
        .flatMap((r: { assignedToId: string; previousId: string | null; assignedById: string }) => [
          r.assignedToId,
          r.previousId,
          r.assignedById,
        ])
        .filter(Boolean) as string[]
    ),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows.map((r: any) => ({
    id: r.id,
    reason: r.reason,
    note: r.note,
    createdAt: r.createdAt,
    assignedByRole: r.assignedByRole,
    assignedTo: byId.get(r.assignedToId) || null,
    previous: r.previousId ? byId.get(r.previousId) || null : null,
    assignedBy: byId.get(r.assignedById) || null,
  }));
};

export const reassignCustomer = async (
  customerId: string,
  newKamId: string,
  actorId: string,
  actorRole = 'LINE_MANAGER',
  note?: string
) => {
  // A Line Manager may only move customers inside their own team; the Head of
  // Department and Super Admin are unscoped, which the guard handles.
  if (actorRole === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, actorId);
  }
  const [customer, newKam] = await Promise.all([
    prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
    prisma.user.findUniqueOrThrow({ where: { id: newKamId }, include: { role: true } }),
  ]);
  // A manager who raised the account keeps it until they hand it over, so
  // they are valid holders too — including handing it back to themselves.
  if (!['KAM', 'LINE_MANAGER', 'HEAD_OF_DEPARTMENT'].includes(newKam.role.name)) {
    throw {
      statusCode: 400,
      code: 'INVALID_ASSIGNEE',
      message: 'Customers can only be held by a Key Account Manager, a Line Manager or the Head of Department.',
    };
  }
  if (customer.handledById === newKamId) {
    throw {
      statusCode: 409,
      code: 'ALREADY_ASSIGNED',
      message: 'This customer is already held by that person.',
    };
  }
  const previousKamId = customer.handledById;
  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: { handledById: newKamId },
    include: CUSTOMER_WITH_HANDLER,
  });
  recordAssignment({
    customerId,
    assignedToId: newKamId,
    previousId: previousKamId,
    assignedById: actorId,
    assignedByRole: actorRole,
    reason: 'REASSIGNED',
    note: note ? sanitizeAndEscape({ n: note }).n : undefined,
  }).catch(() => {});

  logAudit({
    entity: 'Customer',
    entityId: customerId,
    action: 'CUSTOMER_REASSIGNED',
    actorId,
    beforeState: { handledById: previousKamId },
    afterState: { handledById: newKamId },
  }).catch(() => {});
  // Three people need to know, and each for a different reason: the person
  // taking it on, the person losing it — who may have promises outstanding —
  // and the Head of Department, who watches the whole book.
  createNotificationsForUsers([newKamId], {
    label: `${updated.accountName} — This customer has been assigned to you`,
    link: `/app/customers/${updated.barcode}`,
  }).catch(() => {});

  if (previousKamId && previousKamId !== newKamId) {
    createNotificationsForUsers([previousKamId], {
      label: `${updated.accountName} — This customer has been moved to ${newKam.name}`,
      link: `/app/customers/${updated.barcode}`,
    }).catch(() => {});
  }

  notifyHeadsOfDepartment(
    `${updated.accountName} — Reassigned to ${newKam.name}`,
    `/app/customers/${updated.barcode}`
  ).catch(() => {});

  return updated;
};

// Only these actions represent an actual field/document "edit" (direct edit,
// or an edit-request that was approved/rejected) — everything else the
// customer's audit trail records (status transitions, offers, rate
// approvals, account creation, etc.) belongs to the workflow timeline
// (AuditTrail component), not the "Edit History" view.
export const EDIT_HISTORY_ACTIONS = [
  'FIELD_DIRECTLY_EDITED',
  'FIELD_CHANGE_REQUESTED',
  'FIELD_CHANGE_APPROVED',
  'FIELD_CHANGE_REJECTED',
  'DOCUMENT_REUPLOAD_REQUESTED',
  'DOCUMENT_REUPLOAD_APPROVED',
];

export const listCorrespondence = async (customerId: string, requester: { id: string; role: string }) => {
  await assertKamOwnsCustomerIfKam(customerId, requester.id, requester.role);
  if (requester.role === 'LINE_MANAGER') {
    await assertLineManagerOwnsCustomer(customerId, requester.id);
  }
  // Newest copy of each kind first — the most recent wording is almost always
  // what someone has come looking for.
  return prisma.customerCorrespondence.findMany({
    where: { customerId },
    orderBy: [{ kind: 'asc' }, { copyNumber: 'desc' }],
    select: {
      id: true,
      kind: true,
      copyNumber: true,
      body: true,
      rateRef: true,
      rateAtSend: true,
      sentVia: true,
      createdAt: true,
    },
  });
};

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
  // AuditLog is never purged, so this is the complete, permanent edit
  // record for the customer — not a recent-only window.
  return prisma.auditLog.findMany({
    where: { entity: 'Customer', entityId: customerId, action: { in: EDIT_HISTORY_ACTIONS } },
    orderBy: { createdAt: 'desc' },
    include: { actor: { select: { name: true, email: true } } },
  });
};