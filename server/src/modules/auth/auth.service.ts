// src/modules/auth/auth.service.ts
import { prisma } from '../../config/db';
import {
  hashPassword,
  verifyPassword,
  hashOpaqueToken,
  generateOpaqueToken,
  isPasswordPolicyCompliant,
  isPasswordReused,
} from '../../common/utils/hash.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt.util';
import { generateMfaSecret, buildQrCodeDataUrl, verifyMfaToken } from '../../common/utils/mfa.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { invalidateUserPermissionCache } from '../../common/middlewares/auth.middleware';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;
const PASSWORD_HISTORY_SIZE = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 15;
const MFA_MANDATORY_ROLES: string[] = []; // TODO: restore ['LINE_MANAGER', 'SUPER_ADMIN'] once MFA UI is wired up


interface LoginContext {
  ip?: string;
  userAgent?: string;
}

export const login = async (
  email: string,
  password: string,
  mfaToken: string | undefined,
  ctx: LoginContext
) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  const logAttempt = (success: boolean) =>
    prisma.loginLog.create({
      data: { userId: user?.id, email: email.toLowerCase(), success, ip: ctx.ip, userAgent: ctx.userAgent },
    });

  if (!user || !user.isActive) {
    await logAttempt(false);
    throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await logAttempt(false);
    throw { statusCode: 423, code: 'ACCOUNT_LOCKED', message: 'Account temporarily locked due to failed attempts' };
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    const failedCount = user.failedLoginCount + 1;
    const shouldLock = failedCount >= LOCKOUT_THRESHOLD;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : failedCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60000) : null,
      },
    });
    await logAttempt(false);
    throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
  }

  if (MFA_MANDATORY_ROLES.includes(user.role.name) || user.mfaEnabled) {
    if (!user.mfaSecret) {
      throw { statusCode: 428, code: 'MFA_SETUP_REQUIRED', message: 'MFA setup is required before login' };
    }
    if (!mfaToken) {
      throw { statusCode: 401, code: 'MFA_TOKEN_REQUIRED', message: 'MFA token required' };
    }
    const mfaOk = verifyMfaToken(user.mfaSecret, mfaToken);
    if (!mfaOk) {
      await logAttempt(false);
      throw { statusCode: 401, code: 'INVALID_MFA_TOKEN', message: 'Invalid MFA token' };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const permissions = user.role.permissions.map((rp) => rp.permission.key);
  const accessToken = signAccessToken({ sub: user.id, role: user.role.name, permissions });
  const refreshTokenRaw = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(refreshTokenRaw),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await logAttempt(true);
  await invalidateUserPermissionCache(user.id);

  return {
    accessToken,
    refreshToken: refreshTokenRaw,
    user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
  };
};

export const refreshAccessToken = async (refreshTokenRaw: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' };
  }

  const tokenHash = hashOpaqueToken(refreshTokenRaw);

  // Revocation check goes straight to the DB `revoked` flag — no separate
  // Redis blacklist layer. Same correctness, just one less moving part.
  const record = await prisma.refreshToken.findFirst({
    where: { userId: payload.sub, tokenHash, revoked: false },
  });
  if (!record || record.expiresAt < new Date()) {
    throw { statusCode: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token not recognized' };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || !user.isActive) {
    throw { statusCode: 401, code: 'UNAUTHENTICATED', message: 'User no longer active' };
  }

  // Rotate: invalidate old, issue new (session fixation mitigation).
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  const newRefreshTokenRaw = signRefreshToken(user.id);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(newRefreshTokenRaw),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const permissions = user.role.permissions.map((rp) => rp.permission.key);
  const accessToken = signAccessToken({ sub: user.id, role: user.role.name, permissions });

  return { accessToken, refreshToken: newRefreshTokenRaw };
};

export const logout = async (refreshTokenRaw: string | undefined, userId: string) => {
  if (refreshTokenRaw) {
    const tokenHash = hashOpaqueToken(refreshTokenRaw);
    // Marking revoked=true in the DB is checked on every refresh attempt above,
    // so this is effectively instant without needing a separate blacklist store.
    await prisma.refreshToken.updateMany({ where: { userId, tokenHash }, data: { revoked: true } });
  }
  await invalidateUserPermissionCache(userId);
};

export const requestPasswordReset = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Do not reveal whether the email exists.
  if (!user) return;

  const rawToken = generateOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60000),
    },
  });

  // Plugs into notification module rather than sending email directly here.
  return rawToken;
};

export const resetPassword = async (rawToken: string, newPassword: string) => {
  if (!isPasswordPolicyCompliant(newPassword)) {
    throw {
      statusCode: 400,
      code: 'WEAK_PASSWORD',
      message: 'Password must be 8+ chars with upper, lower, number, and special character',
    };
  }

  const tokenHash = hashOpaqueToken(rawToken);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, used: false },
  });
  if (!record || record.expiresAt < new Date()) {
    throw { statusCode: 400, code: 'INVALID_RESET_TOKEN', message: 'Reset token invalid or expired' };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: record.userId } });
  const reused = await isPasswordReused(newPassword, user.passwordHistory);
  if (reused) {
    throw { statusCode: 400, code: 'PASSWORD_REUSED', message: 'Cannot reuse a recent password' };
  }

  const newHash = await hashPassword(newPassword);
  const updatedHistory = [newHash, ...user.passwordHistory].slice(0, PASSWORD_HISTORY_SIZE);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, passwordHistory: updatedHistory },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } }),
  ]);

  await logAudit({ entity: 'User', entityId: user.id, action: 'PASSWORD_RESET', actorId: user.id });
};

export const setupMfa = async (userId: string) => {
  const secret = generateMfaSecret(userId);
  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret.base32, mfaEnabled: false } });
  const qrDataUrl = await buildQrCodeDataUrl(secret.otpauth_url || '');
  return { qrDataUrl, secret: secret.base32 };
};

export const confirmMfa = async (userId: string, token: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.mfaSecret) {
    throw { statusCode: 400, code: 'MFA_NOT_INITIALIZED', message: 'Call setup before confirm' };
  }
  const valid = verifyMfaToken(user.mfaSecret, token);
  if (!valid) throw { statusCode: 400, code: 'INVALID_MFA_TOKEN', message: 'Invalid MFA token' };
  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.key),
    mfaEnabled: user.mfaEnabled,
  };
};