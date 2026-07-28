// server/src/modules/file-storage/fileStorage.access.ts
import { prisma } from "../../config/db";

const UNRESTRICTED_ROLES = ["LINE_MANAGER", "SALES_COORDINATOR", "SUPER_ADMIN"];

// Closes an IDOR: a KAM must own (handle) the customer that the requested
// document belongs to. Other roles keep the same broader access they already
// had via VIEW_CUSTOMER_PROFILE / FULL_SYSTEM_CONTROL — no behavior change
// for them.
export const assertUserCanAccessStorageKey = async (
  storageKey: string,
  requester: { id: string; role: string },
) => {
  if (UNRESTRICTED_ROLES.includes(requester.role)) return;

  const doc = await prisma.onboardingDocument.findFirst({
    where: { storageKey },
    include: { customer: { select: { handledById: true } } },
  });
  if (doc) {
    if (doc.customer.handledById !== requester.id) {
      throw {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not have access to this file",
      };
    }
    return;
  }

  const pending = await prisma.fieldChangeRequest.findFirst({
    where: { pendingFileStorageKey: storageKey },
    include: { customer: { select: { handledById: true } } },
  });
  if (pending) {
    if (pending.customer.handledById !== requester.id) {
      throw {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You do not have access to this file",
      };
    }
    return;
  }

  // Fail closed on any key we can't tie to a customer this user can access.
  throw {
    statusCode: 403,
    code: "FORBIDDEN",
    message: "You do not have access to this file",
  };
};
