// src/common/utils/auditLog.util.ts
import { prisma } from '../../config/db';

interface LogAuditParams {
  entity: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  ip?: string | null;
}

// Single reusable entry point for all mutation logging — never re-implemented per feature.
export const logAudit = async ({
  entity,
  entityId,
  action,
  actorId,
  beforeState,
  afterState,
  ip,
}: LogAuditParams): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      actorId: actorId ?? null,
      beforeState: beforeState as any,
      afterState: afterState as any,
      ip: ip ?? null,
    },
  });
};