// src/modules/users/users.service.ts
import { prisma } from '../../config/db';
import { hashPassword, isPasswordPolicyCompliant, PASSWORD_POLICY_MESSAGE } from '../../common/utils/hash.util';
import { logAudit } from '../../common/utils/auditLog.util';
import { invalidateUserPermissionCache } from '../../common/middlewares/auth.middleware';

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

// Anyone who can actually hold a customer. Line Managers and the Head of
// Department appear alongside the KAMs because they take accounts on
// themselves — a recommendation they raised is theirs until they hand it
// over, and they should be able to hand it back to themselves too.
// Everyone reporting to this person, plus whoever they report to. A Head of
// Department sees the whole department, because that is precisely what
// reports to them.
export const listMyTeam = async (requester: { id: string; role: string }) => {
  const me = await prisma.user.findUniqueOrThrow({
    where: { id: requester.id },
    select: { lineManagerId: true },
  });

  const manager = me.lineManagerId
    ? await prisma.user.findUnique({
        where: { id: me.lineManagerId },
        select: { id: true, name: true, email: true, role: { select: { name: true } } },
      })
    : null;

  const members =
    requester.role === 'HEAD_OF_DEPARTMENT' || requester.role === 'SUPER_ADMIN'
      ? await prisma.user.findMany({
          where: { role: { name: { in: ['KAM', 'SALES_COORDINATOR', 'LINE_MANAGER'] as any } } },
          select: { id: true, name: true, email: true, isActive: true, role: { select: { name: true } } },
          orderBy: [{ role: { name: 'asc' } }, { name: 'asc' }],
        })
      : await prisma.user.findMany({
          where: { lineManagerId: requester.id },
          select: { id: true, name: true, email: true, isActive: true, role: { select: { name: true } } },
          orderBy: [{ role: { name: 'asc' } }, { name: 'asc' }],
        });

  return {
    manager: manager
      ? { id: manager.id, name: manager.name, email: manager.email, role: manager.role.name }
      : null,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      isActive: m.isActive,
      role: m.role.name,
    })),
  };
};

export const listKams = async (lineManagerId?: string, includeManagers = false) => {
  // Asking for managers used to drop the Line Manager scoping for EVERYONE,
  // so a Line Manager could reassign a customer to another team's KAM. The
  // scope is kept on the KAMs and only lifted for the manager roles, which
  // are never "someone else's team" to begin with.
  const subordinateClause: any = {
    role: { name: { in: ['KAM', 'SALES_COORDINATOR'] as any } },
    ...(lineManagerId ? { OR: [{ lineManagerId }, { lineManagerId: null }] } : {}),
  };

  const where: any = includeManagers
    ? {
        isActive: true,
        OR: [subordinateClause, { role: { name: { in: ['LINE_MANAGER', 'HEAD_OF_DEPARTMENT'] as any } } }],
      }
    : {
        isActive: true,
        role: { name: 'KAM' as any },
        ...(lineManagerId ? { OR: [{ lineManagerId }, { lineManagerId: null }] } : {}),
      };

  const people = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return people.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role.name }));
};

export const listLineManagers = async () => {
  return prisma.user.findMany({
    where: { role: { name: 'LINE_MANAGER' }, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
};

export interface UserListFilters {
  search?: string;
  role?: string;
  status?: string;
}

const buildUserWhere = (filters: UserListFilters) => {
  const where: any = {};
  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (filters.role) where.role = { name: filters.role as any };
  if (filters.status === 'active') where.isActive = true;
  if (filters.status === 'inactive') where.isActive = false;
  return where;
};

// Paged and filtered in the database. The admin console used to download the
// entire directory and slice it in the browser, which both capped how many
// accounts could ever be seen and grew the page's cost with the company.
export const listUsers = async (page: number, pageSize: number, filters: UserListFilters = {}) => {
  const where = buildUserWhere(filters);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: items.map(toSafeUser),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
};

const MONTH_BUCKETS = 8;

const startOfMonthMs = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getTime();

const buildCumulativeSeries = (
  rows: { createdAt: Date }[],
  predicate?: (r: any) => boolean
): number[] => {
  const now = new Date();
  const months = Array.from({ length: MONTH_BUCKETS }, (_, i) =>
    startOfMonthMs(new Date(now.getFullYear(), now.getMonth() - (MONTH_BUCKETS - 1 - i), 1))
  );
  const buckets = Array(MONTH_BUCKETS).fill(0);
  rows.forEach((r) => {
    if (predicate && !predicate(r)) return;
    if (!r.createdAt) return;
    const ms = startOfMonthMs(new Date(r.createdAt));
    // Accounts older than the window existed throughout it, so they belong in
    // every bucket — the browser version silently dropped them, which made
    // the totals on the chart disagree with the totals on the cards.
    if (ms < months[0]) {
      for (let j = 0; j < buckets.length; j += 1) buckets[j] += 1;
      return;
    }
    for (let i = months.length - 1; i >= 0; i -= 1) {
      if (ms >= months[i]) {
        for (let j = i; j < buckets.length; j += 1) buckets[j] += 1;
        break;
      }
    }
  });
  return buckets;
};

// Headline figures, the role split, the trend lines and the newest accounts —
// all computed in the database rather than by measuring a fully downloaded
// user table.
export const getUserStats = async () => {
  const [total, active, roleGroups, roles, timeline, recent] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({ by: ['roleId'], _count: { _all: true } }),
    prisma.role.findMany({ select: { id: true, name: true } }),
    // Two columns only, so this stays small even with a very large directory.
    prisma.user.findMany({ select: { createdAt: true, isActive: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { role: true } }),
  ]);

  const roleNameById = new Map(roles.map((r) => [r.id, r.name as string]));

  return {
    total,
    active,
    inactive: total - active,
    byRole: roleGroups
      .map((g) => ({ role: roleNameById.get(g.roleId) || 'UNKNOWN', count: g._count._all }))
      .filter((r) => r.count > 0),
    series: {
      total: buildCumulativeSeries(timeline),
      active: buildCumulativeSeries(timeline, (r) => r.isActive),
      inactive: buildCumulativeSeries(timeline, (r) => !r.isActive),
    },
    recent: recent.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role.name,
      createdAt: u.createdAt,
    })),
  };
};

export const updateUser = async (
  id: string,
  updates: { name?: string; isActive?: boolean; role?: string; lineManagerId?: string | null },
  actorId: string
) => {
  const before = await prisma.user.findUniqueOrThrow({ where: { id }, include: { role: true } });

  // An existing Super Admin's role must not be editable from the console
  // either — demoting the only Super Admin would lock everyone out of user
  // management permanently.
  if (before.role.name === 'SUPER_ADMIN' && updates.role && updates.role !== 'SUPER_ADMIN') {
    throw {
      statusCode: 403,
      code: 'SUPER_ADMIN_PROTECTED',
      message: 'A Super Admin account\'s role can\'t be changed here.',
    };
  }
  // A customer's login is derived from their customer record, so turning it
  // into a staff account would leave that record pointing at a user who is
  // no longer the customer.
  if (before.role.name === 'CUSTOMER' && updates.role && updates.role !== 'CUSTOMER') {
    throw {
      statusCode: 403,
      code: 'CUSTOMER_ACCOUNT_PROTECTED',
      message: 'A customer login can\'t be converted into a staff account.',
    };
  }

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

  // The "send welcome email" switch has been removed rather than left on
  // screen doing nothing: no email provider is connected, so it promised a
  // message that was never going to arrive.
  await logAudit({
    entity: 'User',
    entityId: user.id,
    action: 'USER_CREATED',
    actorId,
    afterState: { email: user.email, role: role.name, lineManagerId: user.lineManagerId },
  });

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
  // Hard ceiling of 100 entries per person: only the 100 most recent items
  // are ever shown, oldest simply fall off the end. Nothing is deleted from
  // AuditLog itself, so the full record stays intact for edit history and
  // compliance — this is a display window only.
  const ACTIVITY_LIMIT = 100;
  const [logins, actions] = await Promise.all([
    prisma.loginLog.findMany({
      where: { userId, success: true },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
    }),
    prisma.auditLog.findMany({
      where: { actorId: userId },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
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

  return merged.slice(0, ACTIVITY_LIMIT);
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_IMPORT_ROWS = 50;

// Bulk-creates Key Account Managers from a spreadsheet the administrator
// uploads. Two deliberate decisions here:
//
//  1. The initial password IS the person's own email address. That would
//     normally fail the password policy, so the policy check is skipped for
//     these accounts only — and every one of them is created with
//     mustChangePassword set, so the very first thing they are made to do is
//     replace it with a password that DOES satisfy the policy. The weak
//     value therefore never survives past first login.
//  2. If the organisation has exactly one Line Manager, every imported KAM
//     is placed under them automatically, because there is nothing to
//     choose between.
export const bulkCreateKams = async (
  rows: { name: string; email: string }[],
  requestedLineManagerId: string | null,
  actorId: string
) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw { statusCode: 400, code: 'NO_ROWS', message: 'The file didn\'t contain any rows to import.' };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    throw {
      statusCode: 400,
      code: 'TOO_MANY_ROWS',
      message: `Please import at most ${MAX_IMPORT_ROWS} people at a time.`,
    };
  }

  let lineManagerId = requestedLineManagerId || null;
  if (lineManagerId) {
    await assertUserIsLineManager(lineManagerId);
  } else {
    const lms = await prisma.user.findMany({
      where: { role: { name: 'LINE_MANAGER' }, isActive: true },
      select: { id: true },
      take: 2,
    });
    if (lms.length === 1) lineManagerId = lms[0].id;
  }

  const kamRole = await prisma.role.findUniqueOrThrow({ where: { name: 'KAM' as any } });

  const created: { name: string; email: string }[] = [];
  const skipped: { email: string; reason: string }[] = [];

  const candidates: { name: string; email: string }[] = [];
  const seen = new Set<string>();

  for (const raw of rows) {
    const name = String(raw?.name ?? '').trim();
    const email = String(raw?.email ?? '').trim().toLowerCase();
    if (!name || !email) {
      skipped.push({ email: email || '(blank)', reason: 'Name and email are both required' });
      continue;
    }
    if (name.length > 150) {
      skipped.push({ email, reason: 'Name is too long (maximum 150 characters)' });
      continue;
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      skipped.push({ email, reason: 'That doesn\'t look like a valid email address' });
      continue;
    }
    if (seen.has(email)) {
      skipped.push({ email, reason: 'This email appears more than once in the file' });
      continue;
    }
    seen.add(email);
    candidates.push({ name, email });
  }

  if (candidates.length > 0) {
    const existing = await prisma.user.findMany({
      where: { email: { in: candidates.map((c) => c.email) } },
      select: { email: true },
    });
    const existingSet = new Set(existing.map((e) => e.email));

    const toCreate = candidates.filter((c) => {
      if (existingSet.has(c.email)) {
        skipped.push({ email: c.email, reason: 'An account with this email already exists' });
        return false;
      }
      return true;
    });

    // Hashed in small parallel batches: bcrypt is intentionally slow, and
    // hashing 50 passwords one after another would hold the request open
    // far longer than necessary.
    const BATCH = 4;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const batch = toCreate.slice(i, i + BATCH);
      // eslint-disable-next-line no-await-in-loop
      const hashes = await Promise.all(batch.map((c) => hashPassword(c.email)));
      for (let j = 0; j < batch.length; j += 1) {
        const c = batch[j];
        try {
          // eslint-disable-next-line no-await-in-loop
          await prisma.user.create({
            data: {
              name: c.name,
              email: c.email,
              passwordHash: hashes[j],
              passwordHistory: [hashes[j]],
              roleId: kamRole.id,
              lineManagerId,
              mustChangePassword: true,
            },
          });
          created.push(c);
        } catch {
          skipped.push({ email: c.email, reason: 'This account could not be created' });
        }
      }
    }
  }

  await logAudit({
    entity: 'User',
    entityId: 'bulk-import',
    action: 'USERS_BULK_IMPORTED',
    actorId,
    afterState: { createdCount: created.length, skippedCount: skipped.length, lineManagerId },
  });

  return { created, skipped, lineManagerId };
};