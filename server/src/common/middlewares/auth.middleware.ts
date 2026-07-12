import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { sendError } from '../utils/apiResponse.util';
import { prisma } from '../../config/db';

// Never trust the JWT payload's permissions/role blindly on sensitive routes —
// re-verify against the DB on every request. No cache layer: slightly more
// DB load, negligible at current scale, simpler and no external dependency.
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const cookieToken = (req as any).cookies?.access_token;
  const token = cookieToken || (header?.startsWith('Bearer ') ? header.slice(7) : null);

  if (!token) {
    return sendError(res, 401, 'UNAUTHENTICATED', 'Missing access token');
  }

  try {
    const payload = verifyAccessToken(token);

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!dbUser || !dbUser.isActive) {
      return sendError(res, 401, 'UNAUTHENTICATED', 'User not found or deactivated');
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role.name,
      permissions: dbUser.role.permissions.map((rp) => rp.permission.key),
    };
    next();
  } catch {
    return sendError(res, 401, 'UNAUTHENTICATED', 'Invalid or expired access token');
  }
};

// No-op now (kept so callers elsewhere don't need to change) — there is no
// cache to invalidate anymore since every request re-reads from the DB.
export const invalidateUserPermissionCache = async (_userId: string) => {
  return;
};