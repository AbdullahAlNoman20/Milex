// server/src/modules/file-storage/fileStorage.access.ts
import { prisma } from "../../config/db";

// Super Admin and Sales Coordinator keep their existing, intentionally
// broad access (SC's role is designed to work across every KAM's pipeline
// per VIEW_ALL_KAM_DASHBOARDS). Line Manager is scoped to their own team
// below instead of being fully unrestricted.
const UNRESTRICTED_ROLES = ["SUPER_ADMIN", "SALES_COORDINATOR"];

const customerLmSelect = {
  handledById: true,
  handledBy: { select: { lineManagerId: true } },
} as const;

const canAccessCustomer = (
  customer: { handledById: string; handledBy: { lineManagerId: string | null } | null },
  requester: { id: string; role: string },
) => {
  if (customer.handledById === requester.id) return true;
  if (requester.role === "LINE_MANAGER" && customer.handledBy?.lineManagerId === requester.id) return true;
  return false;
};

// Closes an IDOR: a KAM must own (handle) the customer that the requested
// document belongs to, and a Line Manager must be that KAM's actual manager
// — not any Line Manager in the system.
export const assertUserCanAccessStorageKey = async (
  storageKey: string,
  requester: { id: string; role: string },
) => {
  if (UNRESTRICTED_ROLES.includes(requester.role)) return;

  const doc = await prisma.onboardingDocument.findFirst({
    where: { storageKey },
    include: { customer: { select: customerLmSelect } },
  });
  if (doc) {
    if (!canAccessCustomer(doc.customer, requester)) {
      throw {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You don't have access to this file.",
      };
    }
    return;
  }

  const pending = await prisma.fieldChangeRequest.findFirst({
    where: { pendingFileStorageKey: storageKey },
    include: { customer: { select: customerLmSelect } },
  });
  if (pending) {
    if (!canAccessCustomer(pending.customer, requester)) {
      throw {
        statusCode: 403,
        code: "FORBIDDEN",
        message: "You don't have access to this file.",
      };
    }
    return;
  }

  // Fail closed on any key we can't tie to a customer this user can access.
  throw {
    statusCode: 403,
    code: "FORBIDDEN",
    message: "You don't have access to this file.",
  };
};