// src/modules/audit-log/auditLog.controller.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { sendSuccess } from '../../common/utils/apiResponse.util';

export const listAuditLogsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const entity = typeof req.query.entity === 'string' ? req.query.entity : undefined;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: entity ? { entity } : undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where: entity ? { entity } : undefined }),
    ]);

    return sendSuccess(res, { items, total, page, pageSize });
  } catch (err) {
    next(err);
  }
};