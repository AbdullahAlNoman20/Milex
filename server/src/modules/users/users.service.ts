// src/modules/users/users.service.ts
import { prisma } from '../../config/db';
import { hashPassword, isPasswordPolicyCompliant, PASSWORD_POLICY_MESSAGE } from '../../common/utils/hash.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { invalidateUserPermissionCache } from '../../common/middlewares/auth.middleware';
import { sendNotification } from '../../jobs/notification.job';

const assertUserIsLineManager = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user || user.role.name !== 'LINE_MANAGER') {
    throw { statusCode: 400, code: 'INVALID_LINE_MANAGER', message: 'Selected user is not a Line Manager' };
  }
};

const toSafeUser = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role.name,
  isActive: user.isActive,
  mfaEnabled: user.mfaEnabled,
  mustChangePassword: !!user.mustChangePassword,
  lineManagerId: user.lineManagerId || null,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

export const listKams = async (lineManagerId?: string) => {
  const kams = await prisma.user.findMany({
    where: { role: { name: 'KAM' }, isActive: true, ...(lineManagerId ? { lineManagerId } : {}) },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  return kams;
};

export const listLineManagers = async () => {
  return prisma.user.findMany({
    where: { role: { name: 'LINE_MANAGER' }, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
};

export const listUsers = async (page: number, pageSize: number) => {
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);
  return { items: items.map(toSafeUser), total, page, pageSize };
};

export const updateUser = async (
  id: string,
  updates: { name?: string; isActive?: boolean; role?: string; lineManagerId?: string | null },
  actorId: string
) => {
  const before = await prisma.user.findUniqueOrThrow({ where: { id }, include: { role: true } });

  if (updates.lineManagerId) {
    await assertUserIsLineManager(updates.lineManagerId);
  }

  const data: any = {};
  if (updates.name) data.name = updates.name;
  if (typeof updates.isActive === 'boolean') data.isActive = updates.isActive;
  if (updates.role) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: updates.role as any } });
    data.roleId = role.id;
  }
  if (updates.lineManagerId !== undefined) data.lineManagerId = updates.lineManagerId;

  const user = await prisma.user.update({ where: { id }, data, include: { role: true } });
  await invalidateUserPermissionCache(id);

  let deactivationSnapshot: unknown = undefined;
  if (typeof updates.isActive === 'boolean' && updates.isActive === false && before.isActive === true) {
    const handledCustomers = await prisma.customer.findMany({
      where: { handledById: id },
      select: { id: true, barcode: true, accountName: true },
    });
    deactivationSnapshot = { handledCustomerCount: handledCustomers.length, handledCustomers };
  }

  await logAudit({
    entity: 'User',
    entityId: id,
    action: 'USER_UPDATED',
    actorId,
    beforeState: { isActive: before.isActive, role: before.role.name, lineManagerId: before.lineManagerId },
    afterState: { isActive: user.isActive, role: user.role.name, lineManagerId: user.lineManagerId, deactivationSnapshot },
  });
  return toSafeUser(user);
};

export const setUserPassword = async (
  targetUserId: string,
  newPassword: string,
  actorId: string,
  requirePasswordChange = true
) => {
  if (!isPasswordPolicyCompliant(newPassword)) {
    throw { statusCode: 400, code: 'WEAK_PASSWORD', message: PASSWORD_POLICY_MESSAGE };
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
  const newHash = await hashPassword(newPassword);
  const updatedHistory = [newHash, ...user.passwordHistory].slice(0, 5);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUserId },
      // The "require password change on next login" switch in the admin
      // console now actually does something — the person is prompted and
      // cannot dismiss it until they set their own password.
      data: { passwordHash: newHash, passwordHistory: updatedHistory, mustChangePassword: requirePasswordChange },
    }),
    prisma.refreshToken.updateMany({ where: { userId: targetUserId }, data: { revoked: true } }),
  ]);
  await invalidateUserPermissionCache(targetUserId);
  await logAudit({ entity: 'User', entityId: targetUserId, action: 'PASSWORD_SET_BY_ADMIN', actorId, afterState: { requirePasswordChange } });
};

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId?: string;
  lineManagerId?: string | null;
  sendWelcomeEmail?: boolean;
}, actorId: string) => {
  if (!isPasswordPolicyCompliant(data.password)) {
    throw { statusCode: 400, code: 'WEAK_PASSWORD', message: PASSWORD_POLICY_MESSAGE };
  }
  if (data.lineManagerId) {
    await assertUserIsLineManager(data.lineManagerId);
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { name: data.role as any } });
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      passwordHistory: [passwordHash],
      roleId: role.id,
      branchId: data.branchId,
      lineManagerId: data.lineManagerId || null,
      // A password an admin typed for someone else must be replaced by that
      // person the first time they sign in.
      mustChangePassword: true,
    },
    include: { role: true },
  });

  await logAudit({
    entity: 'User',
    entityId: user.id,
    action: 'USER_CREATED',
    actorId,
    afterState: { email: user.email, role: role.name, lineManagerId: user.lineManagerId, welcomeEmailRequested: !!data.sendWelcomeEmail },
  });

  if (data.sendWelcomeEmail) {
    // Recorded and queued through the same path every other notification
    // uses. No email provider is wired up yet, so this is a no-op delivery
    // today — the request is still captured in the audit trail above so
    // nothing is silently lost once a provider is connected.
    sendNotification({ kind: 'WELCOME', userId: user.id }).catch(() => {});
  }

  return toSafeUser(user);
};

export const listStaffDirectory = async (lineManagerId?: string) => {
  const staff = await prisma.user.findMany({
    where: { role: { name: { in: ['KAM', 'SALES_COORDINATOR'] } }, isActive: true, ...(lineManagerId ? { lineManagerId } : {}) },
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return staff.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role.name }));
};

// Combines two existing, already-populated tables — LoginLog (from every
// login attempt) and AuditLog (from every logAudit() call across the app,
// which is already wired into rate approvals, offers, agreements, document
// uploads, weekly plans, etc.) — into one timeline. No new logging pipeline
// needed; this just reads what's already being recorded.
export const getUserActivity = async (userId: string) => {
  const [logins, actions] = await Promise.all([
    prisma.loginLog.findMany({
      where: { userId, success: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const merged = [
    ...logins.map((l) => ({
      type: 'LOGIN' as const,
      action: 'LOGGED IN',
      entity: null as string | null,
      createdAt: l.createdAt,
      ip: l.ip,
    })),
    ...actions.map((a) => ({
      type: 'ACTION' as const,
      action: a.action,
      entity: a.entity,
      createdAt: a.createdAt,
      ip: a.ip,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return merged.slice(0, 150);
};