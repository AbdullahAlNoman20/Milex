// server/src/common/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util";
import { sendError } from "../utils/apiResponse.util";
import { prisma } from "../../config/db";

interface CachedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  expiresAt: number;
}

// Short-lived in-process cache so every request doesn't need a DB round-trip
// + join just to authenticate. TTL kept short (30s) so role/permission/
// deactivation changes still take effect almost immediately.
const PERMISSION_CACHE_TTL_MS = 30_000;
const userCache = new Map<string, CachedUser>();

const loadUser = async (userId: string): Promise<CachedUser | null> => {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
  if (!dbUser) return null;
  const entry: CachedUser = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role.name,
    permissions: dbUser.role.permissions.map((rp) => rp.permission.key),
    isActive: dbUser.isActive,
    expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS,
  };
  userCache.set(userId, entry);
  return entry;
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  const cookieToken = (req as any).cookies?.access_token;
  const token =
    cookieToken || (header?.startsWith("Bearer ") ? header.slice(7) : null);

  if (!token) {
    return sendError(res, 401, "UNAUTHENTICATED", "Missing access token");
  }

  try {
    const payload = verifyAccessToken(token);

    let cached = userCache.get(payload.sub);
    if (!cached || cached.expiresAt < Date.now()) {
      cached = (await loadUser(payload.sub)) || undefined;
    }

    if (!cached || !cached.isActive) {
      return sendError(
        res,
        401,
        "UNAUTHENTICATED",
        "User not found or deactivated",
      );
    }

    req.user = {
      id: cached.id,
      email: cached.email,
      role: cached.role,
      permissions: cached.permissions,
    };
    next();
  } catch {
    return sendError(
      res,
      401,
      "UNAUTHENTICATED",
      "Invalid or expired access token",
    );
  }
};

// Forces an immediate refresh on next request instead of waiting out the TTL —
// called right after login, logout, role/permission changes, etc.
export const invalidateUserPermissionCache = async (userId: string) => {
  userCache.delete(userId);
};
