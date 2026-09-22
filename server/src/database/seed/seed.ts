// src/database/seed/seed.ts
import { RoleName } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PERMISSIONS } from '../../common/constants/permissions.constant';
import { prisma } from '../../config/db';

const ROLE_PERMISSION_MAP: Record<RoleName, string[]> = {
  KAM: [
    PERMISSIONS.CREATE_RECOMMENDATION,
    PERMISSIONS.REVISE_RECOMMENDATION,
    PERMISSIONS.UPLOAD_SIGNED_AGREEMENT,
    PERMISSIONS.ACTIVATE_PROFILE,
    PERMISSIONS.VIEW_CUSTOMER_PROFILE,
    PERMISSIONS.SUBMIT_WEEKLY_PLAN,
    PERMISSIONS.SUBMIT_DAILY_REPORT,
    // Document collection sits entirely with the Sales Coordinator now — the
    // KAM works the relationship, the Coordinator files the paperwork.
    PERMISSIONS.REQUEST_TIME_EXTENSION,
    PERMISSIONS.SUBMIT_FINAL_ONBOARDING,
    PERMISSIONS.REQUEST_INFO_UPDATE,
  ],
  SALES_COORDINATOR: [
    PERMISSIONS.PROCESS_APPROVED_RATE,
    PERMISSIONS.DRAFT_OFFER,
    PERMISSIONS.FINALIZE_OFFER,
    PERMISSIONS.DRAFT_AGREEMENT,
    PERMISSIONS.FINALIZE_AGREEMENT,
    PERMISSIONS.VIEW_CUSTOMER_PROFILE,
    PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS,
    PERMISSIONS.UPLOAD_ONBOARDING_DOCUMENT,
    // REQUEST_TIME_EXTENSION intentionally removed — only the KAM may
    // request the 5-day provisional extension, not the Sales Coordinator.
    PERMISSIONS.SUBMIT_FINAL_ONBOARDING,
    PERMISSIONS.REQUEST_INFO_UPDATE,
  ],
  LINE_MANAGER: [
    PERMISSIONS.APPROVE_RATE,
    PERMISSIONS.REJECT_RATE,
    PERMISSIONS.APPROVE_INFO_UPDATE,
    PERMISSIONS.REVIEW_WEEKLY_PLAN,
    PERMISSIONS.VIEW_FOLLOWUP_REMINDERS,
    PERMISSIONS.VIEW_CUSTOMER_PROFILE,
    PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS,
    PERMISSIONS.EXTEND_PROVISIONAL_PERIOD,
    PERMISSIONS.VIEW_ACTIVITY_LOG,
    // Activating an account is the last irreversible step, so it belongs to
    // the Head of Department — a Line Manager prepares the case but does not
    // close it.
    // A Line Manager may raise a rate request and create a recommendation
    // themselves, but may not answer their own request for a better rate —
    // that decision belongs to the Head of Department.
    PERMISSIONS.REQUEST_NEW_RATE,
    PERMISSIONS.CREATE_RECOMMENDATION,
    PERMISSIONS.REVISE_RECOMMENDATION,
    PERMISSIONS.REQUEST_INFO_UPDATE,
    PERMISSIONS.REASSIGN_CUSTOMER,
  ],
  // Everything a Line Manager can do, across every team rather than one, plus
  // the authority to set a new best rate. Deliberately without MANAGE_USERS
  // or FULL_SYSTEM_CONTROL — this is a business role, not an administrator.
  HEAD_OF_DEPARTMENT: [
    PERMISSIONS.APPROVE_RATE,
    PERMISSIONS.REJECT_RATE,
    PERMISSIONS.APPROVE_INFO_UPDATE,
    PERMISSIONS.REVIEW_WEEKLY_PLAN,
    PERMISSIONS.VIEW_FOLLOWUP_REMINDERS,
    PERMISSIONS.VIEW_CUSTOMER_PROFILE,
    PERMISSIONS.VIEW_ALL_KAM_DASHBOARDS,
    PERMISSIONS.VIEW_ALL_TEAMS,
    PERMISSIONS.APPROVE_PROVISIONAL_ONBOARDING,
    PERMISSIONS.EXTEND_PROVISIONAL_PERIOD,
    PERMISSIONS.FINALIZE_ONBOARDING,
    PERMISSIONS.ACTIVATE_PROFILE,
    PERMISSIONS.VIEW_ACTIVITY_LOG,
    PERMISSIONS.REQUEST_NEW_RATE,
    PERMISSIONS.GRANT_NEW_RATE,
    PERMISSIONS.CREATE_RECOMMENDATION,
    PERMISSIONS.REVISE_RECOMMENDATION,
    PERMISSIONS.REQUEST_INFO_UPDATE,
    PERMISSIONS.REASSIGN_CUSTOMER,
    PERMISSIONS.EXPORT_DATA,
  ],
  // Holds no permissions at all yet. The account exists so the person can
  // sign in and so their identity is already in place; the customer-facing
  // features are a later release.
  CUSTOMER: [],
  SUPER_ADMIN: Object.values(PERMISSIONS),
};

async function main() {
  for (const permKey of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { key: permKey },
      update: {},
      create: { key: permKey },
    });
  }

  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    const permKeys = ROLE_PERMISSION_MAP[roleName];
    const perms = await prisma.permission.findMany({ where: { key: { in: permKeys } } });

    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  // One account, and only one: the Super Admin who sets the system up. Every
  // other person is created from the user console by them, with a real name
  // and a real address, so no placeholder login ever exists to be forgotten
  // about and left working.
  const ADMIN_EMAIL = 'milexadminair@milexair.com';
  const ADMIN_PASSWORD = 'Test@Pass123!';

  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existingAdmin) {
    console.log(`Super Admin already exists (${ADMIN_EMAIL}) — left untouched.`);
  } else {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'SUPER_ADMIN' as RoleName } });
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        name: 'MilexAir Admin',
        email: ADMIN_EMAIL,
        passwordHash,
        passwordHistory: [passwordHash],
        roleId: role.id,
        // This password is written in the source, so it is treated as a
        // one-time key: sign in with it once and the system requires a new
        // one before anything else can be done.
        mustChangePassword: true,
      },
    });
    console.log(`Seeded Super Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  const DEFAULT_CARRIERS = ['DHL', 'FedEx', 'UPS', 'Aramex', 'TNT Express'];
  for (const name of DEFAULT_CARRIERS) {
    await prisma.serviceProvider.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(
    'Seed complete. Sign in as the Super Admin, set a new password when prompted, then create everyone else from User & Access Management.'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });