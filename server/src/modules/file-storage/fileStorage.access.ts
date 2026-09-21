// server/src/modules/file-storage/fileStorage.access.ts
import { prisma } from "../../config/db";
import { isUnassignedSubordinate } from "../../common/utils/scopeGuard.util";

// Only these two see every customer's paperwork by design: the Super Admin,
// and the Head of Department that the whole department reports up to.
// A Sales Coordinator files paperwork across every KAM's pipeline, so they
// are included as well. A KAM sees only the customers they hold; a Line
// Manager only their own team's.
const UNRESTRICTED_ROLES = ["SUPER_ADMIN", "HEAD_OF_DEPARTMENT", "SALES_COORDINATOR"];

const customerScopeSelect = {
  handledById: true,
  handledBy: { select: { lineManagerId: true, role: { select: { name: true } } } },
} as const;

type ScopedCustomer = {
  handledById: string;
  handledBy: { lineManagerId: string | null; role: { name: string } | null } | null;
};

const canAccessCustomer = (customer: ScopedCustomer, requester: { id: string; role: string }) => {
  if (customer.handledById === requester.id) return true;
  if (requester.role === "LINE_MANAGER") {
    if (customer.handledBy?.lineManagerId === requester.id) return true;
    if (isUnassignedSubordinate(customer.handledBy?.lineManagerId, customer.handledBy?.role?.name)) return true;
  }
  return false;
};

const forbidden = () => ({
  statusCode: 403,
  code: "FORBIDDEN",
  message: "You don't have access to this file.",
});

export interface StoredFileMeta {
  mimeType: string | null;
  originalName: string | null;
}

// Closes an IDOR: a KAM must hold the customer that the requested document
// belongs to, and a Line Manager must be that KAM's actual manager — not any
// Line Manager in the system. Returns the stored file's metadata so the
// download handler can serve it with the correct, non-guessed content type.
export const assertUserCanAccessStorageKey = async (
  storageKey: string,
  requester: { id: string; role: string },
): Promise<StoredFileMeta> => {
  const doc = await prisma.onboardingDocument.findFirst({
    where: { storageKey },
    select: {
      mimeType: true,
      originalName: true,
      customer: { select: customerScopeSelect },
    },
  });
  if (doc) {
    if (!UNRESTRICTED_ROLES.includes(requester.role) && !canAccessCustomer(doc.customer as ScopedCustomer, requester)) {
      throw forbidden();
    }
    return { mimeType: doc.mimeType, originalName: doc.originalName };
  }

  const pending = await prisma.fieldChangeRequest.findFirst({
    where: { pendingFileStorageKey: storageKey },
    select: {
      pendingFileMime: true,
      pendingFileName: true,
      customer: { select: customerScopeSelect },
    },
  });
  if (pending) {
    if (!UNRESTRICTED_ROLES.includes(requester.role) && !canAccessCustomer(pending.customer as ScopedCustomer, requester)) {
      throw forbidden();
    }
    return { mimeType: pending.pendingFileMime, originalName: pending.pendingFileName };
  }

  // Fail closed on any key we can't tie to a customer record at all.
  throw forbidden();
};