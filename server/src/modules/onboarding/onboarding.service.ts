// server/src/modules/onboarding/onboarding.service.ts
import { prisma } from "../../config/db";
import { CUSTOMER_STATUS } from "../../common/constants/status.constant";
import { transitionCustomerStatus } from "../../common/utils/stateMachine.util";
import { uploadFileToSupabase } from '../file-storage/fileStorage.service';
import { runFileScan } from '../../jobs/file-scan.job';
import { sendCustomerAccountEmail } from '../../jobs/notification.job';
import { logAudit } from '../../common/utils/auditLog.util';
import { sanitizeAndEscape } from "../customers/sanitize.helper";

const DEFAULT_EXTENSION_DAYS = 5;

export const uploadOnboardingDocument = async (
  customerId: string,
  buffer: Buffer,
  originalName: string,
  documentType: string,
  documentNumber: string | undefined,
  expiryDate: string | undefined,
  kamId: string,
) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });
  if (customer.accountProfileType !== "PROVISIONAL") {
    throw {
      statusCode: 409,
      code: "NOT_PROVISIONAL",
      message: "Customer is not in provisional stage",
    };
  }
  // The offer-letter attachment (a supporting excel) is uploaded at the moment
  // the offer is sent — i.e. before the customer has responded — so it's
  // exempt from the "offer accepted" gate that protects every other category.
  if (documentType !== "OFFER_LETTER_EXCEL" && !customer.offerAccepted) {
    throw {
      statusCode: 409,
      code: "OFFER_NOT_ACCEPTED",
      message: "The offer must be accepted before documents can be uploaded",
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
) => {
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
    return transitionCustomerStatus({
      customerId: customer.id,
      toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
      actorId: lmId,
      historyAction: "TIME EXTENSION REJECTED BY LM",
    });
  }

  const newExtensionTotal = customer.provisionalExtensionDays + grantedDays;
  const base = customer.provisionalCreatedAt ?? new Date();
  const newExpiry = new Date(
    base.getTime() + (21 + newExtensionTotal) * 86400000,
  );

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

export const submitFinalOnboardingRequest = async (
  customerId: string,
  kamId: string,
) => {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
    include: { documents: true },
  });

  const hasCleanDocs =
    customer.documents.length > 0 &&
    customer.documents.every((d) => d.scanStatus === "CLEAN");
  if (!hasCleanDocs) {
    throw {
      statusCode: 409,
      code: "DOCUMENTS_NOT_READY",
      message:
        "All onboarding documents must be uploaded and pass virus scanning first",
    };
  }

  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
    actorId: kamId,
    historyAction: "FINAL ONBOARDING REQUESTED BY KAM",
    historySubText: "Awaiting final Line Manager verification",
  });
};

export const decideFinalOnboarding = async (
  customerId: string,
  approve: boolean,
  comments: string | undefined,
  lmId: string
) => {
  if (approve) {
    const updated = await transitionCustomerStatus({
      customerId,
      toStatus: CUSTOMER_STATUS.ACTIVE_ACCOUNT,
      actorId: lmId,
      extraUpdates: { accountProfileType: 'REGULAR' },
      historyAction: 'FINAL ONBOARDING APPROVED — ACCOUNT ACTIVATED',
    });
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
  return transitionCustomerStatus({
    customerId,
    toStatus: CUSTOMER_STATUS.PROVISIONAL_ACTIVE,
    actorId: lmId,
    extraUpdates: {
      lmNote: comments ? sanitizeAndEscape({ c: comments }).c : undefined,
    },
    historyAction: "FINAL ONBOARDING REJECTED — RETURNED TO KAM",
    historySubText: comments || "",
  });
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
    await transitionCustomerStatus({
      customerId: c.id,
      toStatus: CUSTOMER_STATUS.PROVISIONAL_EXPIRED,
      actorId: c.handledById,
      historyAction: "PROVISIONAL ACCOUNT EXPIRED",
      historySubText: "Auto-deactivated by system",
    });
  }
  return overdue.length;
};
