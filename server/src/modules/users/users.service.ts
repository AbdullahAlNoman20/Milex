// src/modules/users/users.service.ts
import { prisma } from '../../config/db';
import { hashPassword, isPasswordPolicyCompliant } from '../../common/utils/hash.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { invalidateUserPermissionCache } from '../../common/middlewares/auth.middleware';

const toSafeUser = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role.name,
  isActive: user.isActive,
  mfaEnabled: user.mfaEnabled,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

export const listKams = async () => {
  const kams = await prisma.user.findMany({
    where: { role: { name: 'KAM' }, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  return kams;
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

export const createUser = async (data: {
  name: string;
  email: string;
  password: string;
  role: string;
  branchId?: string;
}, actorId: string) => {
  if (!isPasswordPolicyCompliant(data.password)) {
    throw { statusCode: 400, code: 'WEAK_PASSWORD', message: 'Password does not meet policy requirements' };
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
    },
    include: { role: true },
  });

  await logAudit({ entity: 'User', entityId: user.id, action: 'USER_CREATED', actorId, afterState: { email: user.email, role: role.name } });
  return toSafeUser(user);
};

export const updateUser = async (
  id: string,
  updates: { name?: string; isActive?: boolean; role?: string },
  actorId: string
) => {
  const before = await prisma.user.findUniqueOrThrow({ where: { id }, include: { role: true } });

  const data: any = {};
  if (updates.name) data.name = updates.name;
  if (typeof updates.isActive === 'boolean') data.isActive = updates.isActive;
  if (updates.role) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: updates.role as any } });
    data.roleId = role.id;
  }

  const user = await prisma.user.update({ where: { id }, data, include: { role: true } });
  await invalidateUserPermissionCache(id);
  await logAudit({
    entity: 'User',
    entityId: id,
    action: 'USER_UPDATED',
    actorId,
    beforeState: { isActive: before.isActive, role: before.role.name },
    afterState: { isActive: user.isActive, role: user.role.name },
  });
  return toSafeUser(user);
};

export const listStaffDirectory = async () => {
  const staff = await prisma.user.findMany({
    where: { role: { name: { in: ['KAM', 'SALES_COORDINATOR'] } }, isActive: true },
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
    orderBy: [{ name: 'asc' }],
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
    prisma.loginLog.findMany({ where: { userId, success: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.auditLog.findMany({ where: { actorId: userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
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