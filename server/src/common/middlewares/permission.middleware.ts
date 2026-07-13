// src/common/middlewares/permission.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.util';

// Default-deny: every protected route must pass an explicit permission check,
// never a role-hierarchy assumption.
export const requirePermission = (...permissions: string[]) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
  }
  const hasAny = permissions.some((p) => req.user!.permissions.includes(p));
  if (!hasAny) {
    return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
  }
  next();
};

// Horizontal privilege escalation guard: resource must be scoped to the
// current user unless they hold the override permission.
export const requireOwnershipOrPermission = (
  getOwnerId: (req: Request) => string | undefined,
  overridePermission: string
) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return sendError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
  const ownerId = getOwnerId(req);
  if (ownerId === req.user.id || req.user.permissions.includes(overridePermission)) {
    return next();
  }
  return sendError(res, 403, 'FORBIDDEN', 'You do not have access to this resource');
};