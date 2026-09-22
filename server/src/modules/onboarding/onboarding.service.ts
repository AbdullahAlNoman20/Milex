// server/src/modules/onboarding/onboarding.service.ts
import { prisma } from "../../config/db";
import { CUSTOMER_STATUS } from "../../common/constants/status.constant";
import { transitionCustomerStatus } from "../../common/utils/stateMachine.util";
import { uploadFileToSupabase, deleteFileFromSupabase } from '../file-storage/fileStorage.service';
import { runFileScan } from '../../jobs/file-scan.job';
import { sendCustomerAccountEmail } from '../../jobs/notification.job';
import { logAudit } from "../../common/utils/auditLog.util";
import { sanitizeAndEscape } from "../customers/sanitize.helper";
import { DOCUMENT_TYPE_LABELS, notifyHeadsOfDepartment } from "../customers/customers.service";
import { createNotificationsForUsers } from "../notifications/notifications.service";
import { assertKamOwnsCustomerIfKam } from "../../common/utils/scopeGuard.util";
import { assertLineManagerOwnsCustomer } from "../../common/utils/scopeGuard.util";
import { ensureCustomerAccount } from "../customers/customerAccount.service";

const DEFAULT_EXTENSION_DAYS = 5;

export const uploadOnboardingDocument = async (
  customerId: string,
  buffer: Buffer,
  originalName: string,
  documentType: string,
  documentNumber: string | undefined,
  expiryDate: string | undefined,
  kamId: string,
  actorRole: string,
) => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });
  if (customer.accountProfileType !== "PROVISIONAL") {
    throw {
      statusCode: 409,
      code: "NOT_PROVISIONAL",
      message: "Documents can only be uploaded for provisional accounts. This customer isn\'t in that stage right now.",
    };
  }
  // The offer-letter attachment (a supporting excel) is uploaded at the moment
  // the offer is sent — i.e. before the customer has responded — so it's
  // exempt from the "offer accepted" gate that protects every other category.
  if (documentType !== "OFFER_LETTER_EXCEL" && !customer.offerAccepted) {
    throw {
      statusCode: 409,
      code: "OFFER_NOT_ACCEPTED",
      message: "The customer needs to accept the offer before documents can be uploaded.",
    };
  }

  const { storageKey, mimeType, sizeBytes } = await uploadFileToSupabase(
    buffer,
    originalName,
  );
  const cleanType = sanitizeAndEscape({ t: documentType }).t;
  const cleanNumber = documentNumber
    ? sanitizeAndEscape({ n: documentNumber }).n
    : null;
  const parsedExpiry = expiryDate ? new Date(expiryDate) : null;
  const cleanName = sanitizeAndEscape({ n: originalName }).n;

  // One document per category per customer — re-uploading the same
  // category replaces the previous file rather than piling up duplicates.
  const existing = await prisma.onboardingDocument.findFirst({
    where: { customerId, documentType: cleanType },
  });
  const previousStorageKey = existing?.storageKey;

  const doc = existing
    ? await prisma.onboardingDocument.update({
        where: { id: existing.id },
        data: {
          originalName: cleanName,
          documentNumber: cleanNumber,
          expiryDate: parsedExpiry,
          storageKey,
          mimeType,
          sizeBytes,
          uploadedById: kamId,
          scanStatus: "PENDING",
        },
      })
    : await prisma.onboardingDocument.create({
        data: {
          customerId,
          originalName: cleanName,
          documentType: cleanType,
          documentNumber: cleanNumber,
          expiryDate: parsedExpiry,
          storageKey,
          mimeType,
          sizeBytes,
          uploadedById: kamId,
          scanStatus: "PENDING",
        },
      });

  if (previousStorageKey && previousStorageKey !== storageKey) {
    await deleteFileFromSupabase(previousStorageKey);
  }

  await runFileScan(doc.id);
  await logAudit({
    entity: "OnboardingDocument",
    entityId: doc.id,
    action: "DOCUMENT_UPLOADED",
    actorId: kamId,
    afterState: { documentType: cleanType, originalName: cleanName },
  });
  return doc;
};

export const requestTimeExtension = async (
  customerId: string,
  requestedDays: number,
  reason: string,
  kamId: string,
  actorRole = 'KAM',
) => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
  const clean = sanitizeAndEscape({ reason });
  const request = await prisma.timeExtensionRequest.create({
    data: {
      customerId,
      requestedById: kamId,
      requestedDays,
      reason: clean.reason,
    },
  });

  await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_EXTENSION_REQUESTED,
    actorId: kamId,
    historyAction: "TIME EXTENSION REQUESTED BY KAM",
    historySubText: `Requested ${requestedDays} day(s)`,
  });

  return request;
};

export const decideTimeExtension = async (
  requestId: string,
  approve: boolean,
  grantedDaysInput: number | undefined,
  lmId: string,
) => {
  const request = await prisma.timeExtensionRequest.findUniqueOrThrow({
    where: { id: requestId },
  });
  await assertLineManagerOwnsCustomer(request.customerId, lmId);
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: request.customerId },
  });
  const grantedDays = approve
    ? (grantedDaysInput ?? DEFAULT_EXTENSION_DAYS)
    : 0;

  await prisma.timeExtensionRequest.update({
    where: { id: requestId },
    data: { approved: approve, decidedById: lmId, decidedAt: new Date() },
  });

  if (!approve) {
    // An extension is only ever requested from an already-expired account, so
    // refusing one must leave it expired. Sending it back to
    // PROVISIONAL_ACTIVE revived the very account that had just been refused
    // more time.
    return transitionCustomerStatus({
      customerId: customer.id,
      toStatus: CUSTOMER_STATUS.PROVISIONAL_EXPIRED,
      actorId: lmId,
      historyAction: "TIME EXTENSION REJECTED BY LM",
      historySubText: "The provisional period remains expired",
    });
  }

  const newExtensionTotal = customer.provisionalExtensionDays + grantedDays;
  const base = customer.provisionalCreatedAt ?? new Date();
  const computed = base.getTime() + (21 + newExtensionTotal) * 86400000;
  // An account that expired weeks ago would otherwise get an expiry date
  // still in the past, i.e. an "approved" extension that grants nothing.
  // The granted days are counted from now in that case.
  const floor = Date.now() + grantedDays * 86400000;
  const newExpiry = new Date(Math.max(computed, floor));

  return transitionCustomerStatus({
    customerId: customer.id,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    actorId: lmId,
    extraUpdates: {
      provisionalExtensionDays: newExtensionTotal,
      provisionalExpiryDate: newExpiry,
    },
    historyAction: "TIME EXTENSION APPROVED BY LM",
    historySubText: `Extended by ${grantedDays} day(s)`,
  });
};

// Trade licence only — see the matching note in customers.service.ts.
const REQUIRED_FINAL_DOC_TYPES = ["TRADE_LICENSE"];

export const submitFinalOnboardingRequest = async (
  customerId: string,
  kamId: string,
  actorRole: string,
) => {
  await assertKamOwnsCustomerIfKam(customerId, kamId, actorRole);
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: { documents: true },
  });

  const docsByType = new Map(customer.documents.map((d) => [d.documentType, d]));
  const missingDocs = REQUIRED_FINAL_DOC_TYPES.filter((t) => !docsByType.has(t));
  if (missingDocs.length > 0) {
    const humanNames = missingDocs.map((t) => DOCUMENT_TYPE_LABELS[t] || t);
    throw {
      statusCode: 409,
      code: "DOCUMENTS_NOT_READY",
      message: `Missing required documents: ${humanNames.join(", ")}`,
    };
  }
  const notCleanDocs = REQUIRED_FINAL_DOC_TYPES.filter(
    (t) => docsByType.get(t)?.scanStatus !== "CLEAN",
  );
  if (notCleanDocs.length > 0) {
    throw {
      statusCode: 409,
      code: "DOCUMENTS_NOT_READY",
      message: "All required documents must pass virus scanning first",
    };
  }

  // Every account goes to the Head of Department, whoever raised it. The
  // rate approval can be skipped when the person setting it is the person
  // who would approve it, but activation cannot: it is the last irreversible
  // step, and it belongs to one desk regardless of who prepared the case.
  const submitted = await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
    actorId: kamId,
    // Whatever was flagged last time has now been answered by this
    // resubmission, so the notice comes off the record.
    extraUpdates: { onboardingReturnNote: null },
    historyAction: 'FINAL ONBOARDING REQUESTED',
    historySubText: 'Awaiting Head of Department approval',
  });

  // Activation is theirs alone, so they are the only people who need to
  // know it is waiting.
  notifyHeadsOfDepartment(
    `${submitted.accountName} — Onboarding complete, ready for activation`,
    `/app/customers/${submitted.barcode}`
  ).catch(() => {});

  return submitted;
};

// Activating an account is the last irreversible step in the whole flow, so
// it rests with the Head of Department rather than the Line Manager who may
// have set the rate. Until they say yes the account stays provisional, which
// keeps the customer live and working while the paperwork is checked.
export const decideFinalOnboarding = async (
  customerId: string,
  approve: boolean,
  comments: string | undefined,
  actorId: string,
  actorRole = 'HEAD_OF_DEPARTMENT',
) => {
  if (!['HEAD_OF_DEPARTMENT', 'SUPER_ADMIN'].includes(actorRole)) {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only the Head of Department can approve an account for activation.',
    };
  }
  const lmId = actorId;
  // Explicit gate: this decision only exists for an account actually
  // waiting on final review. Without it, a stale/duplicated request from
  // another status surfaced as a raw "invalid transition" error.
  const target = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    select: { status: true },
  });
  if (target.status !== CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING) {
    throw {
      statusCode: 409,
      code: 'INVALID_STATE',
      message: 'This account is not waiting for final onboarding review. Please refresh the page.',
    };
  }
  if (approve) {
    const updated = await transitionCustomerStatus({
      customerId,
      toStatus: CUSTOMER_STATUS.ACTIVE_ACCOUNT,
      actorId: lmId,
      extraUpdates: { accountProfileType: 'REGULAR' },
      historyAction: 'FINAL ONBOARDING APPROVED — ACCOUNT ACTIVATED',
    });
    // The customer's own login comes into existence the moment their account
    // is real, so their identity is never retro-fitted later.
    ensureCustomerAccount(customerId).catch(() => {});
    sendCustomerAccountEmail({
      accountName: updated.accountName,
      barcode: updated.barcode,
      businessType: updated.businessType,
      address: updated.address,
      phone: updated.phone,
      email: updated.email,
      status: updated.status,
    }).catch(() => {});
    return updated;
  }
  const cleanComments = comments ? sanitizeAndEscape({ c: comments }).c : '';

  const returned = await transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    actorId: lmId,
    extraUpdates: {
      // What needs correcting, kept on the record so the panel can show it
      // rather than it living only in the audit trail.
      onboardingReturnNote: cleanComments || null,
      // Reopens the Final Account Profile panel so the Sales Coordinator can
      // correct what was flagged and submit again, with nothing lost in
      // between and the customer still live throughout.
      finalProfileCompleted: false,
      // A regular-mode submission sets the profile type to REGULAR on its way
      // in. Returning it without putting that back left the account in a
      // provisional status with a regular profile type, which every panel
      // read as "not in the document window" — so the form, the uploads and
      // the submit button all vanished and there was no way to resubmit.
      accountProfileType: 'PROVISIONAL',
    },
    historyAction: 'FINAL ONBOARDING RETURNED FOR CORRECTION',
    historySubText: cleanComments,
    // The general workflow audience does not include the Sales Coordinators,
    // and they are precisely the people who have to act on this — they fill
    // in the profile and file the documents. Told directly below instead.
    skipWorkflowNotification: true,
  });

  // Everyone who has to do something about it: the Sales Coordinators who
  // make the correction, and the account's own holder, who is accountable
  // for it going through.
  try {
    const scs = await prisma.user.findMany({
      where: { role: { name: 'SALES_COORDINATOR' }, isActive: true },
      select: { id: true },
    });
    const recipients = [...new Set([...scs.map((s) => s.id), returned.handledById])];
    await createNotificationsForUsers(recipients, {
      label: `${returned.accountName} — Onboarding returned for correction${cleanComments ? `: ${cleanComments}` : ''}`,
      link: `/app/customers/${returned.barcode}`,
      isOverdue: true,
    });
  } catch (err) {
    console.warn('[notifications] onboarding return notice failed (non-fatal):', (err as Error)?.message);
  }

  return returned;
};

export const expireOverdueProvisionalAccounts = async () => {
  const now = new Date();
  const overdue = await prisma.customer.findMany({
    where: {
      status: { in: [CUSTOMER_STATUS.PROVISIONAL_ACTIVE as any] },
      provisionalExpiryDate: { lt: now },
    },
  });
  for (const c of overdue) {
    // eslint-disable-next-line no-await-in-loop
    await transitionCustomerStatus({
      customerId: c.id,
      toStatus: CUSTOMER_STATUS.PROVISIONAL_EXPIRED,
      actorId: c.handledById,
      historyAction: "PROVISIONAL ACCOUNT EXPIRED",
      historySubText: "Auto-deactivated by system",
      // This is a system/cron action, not the KAM clicking a button — the
      // KAM must still be notified that their own account just expired.
      notifyExcludeActor: false,
    });
  }
  return overdue.length;
};
