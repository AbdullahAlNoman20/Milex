// server/src/modules/backup/backup.service.ts
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { logAudit } from '../../common/utils/auditLog.util';

const BACKUP_VERSION = 1;
// Guard so a backup can never exhaust server memory: past this, the files
// are listed but not embedded, and the admin is told to copy the upload
// directory separately.
const MAX_EMBEDDED_FILES_BYTES = 200 * 1024 * 1024;

export interface BackupFile {
  storageKey: string;
  sizeBytes: number;
  contentBase64?: string;
}

const uploadDir = () => path.resolve(env.UPLOAD_DIR);

export const getStorageStats = async () => {
  let fileCount = 0;
  let totalBytes = 0;
  try {
    const names = await fs.readdir(uploadDir());
    for (const name of names) {
      // eslint-disable-next-line no-await-in-loop
      const stat = await fs.stat(path.join(uploadDir(), name)).catch(() => null);
      if (stat?.isFile()) {
        fileCount += 1;
        totalBytes += stat.size;
      }
    }
  } catch {
    /* directory not created yet */
  }

  const [customers, users, documents, weeklyPlans, dailyReports, auditLogs, notifications] = await Promise.all([
    prisma.customer.count(),
    prisma.user.count(),
    prisma.onboardingDocument.count(),
    prisma.weeklyPlan.count(),
    prisma.dailyReport.count(),
    prisma.auditLog.count(),
    prisma.notification.count(),
  ]);

  return {
    files: { count: fileCount, totalBytes },
    records: { customers, users, documents, weeklyPlans, dailyReports, auditLogs, notifications },
    generatedAt: new Date().toISOString(),
  };
};

// A complete, self-contained snapshot the admin can download and store off
// the server. Refresh/reset tokens are deliberately excluded — restoring
// live session tokens would be a security hole, and every user simply logs
// in again after a restore.
export const createBackup = async (includeFiles: boolean, actorId: string) => {
  const [
    roles, permissions, rolePermissions, users, customers, contacts, shippingDetails,
    serviceProviders, onboardingDocuments, timeExtensionRequests, fieldChangeRequests,
    customerHistory, weeklyPlans, visits, dailyReports, reportVisits, notifications, auditLogs, loginLogs,
  ] = await Promise.all([
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.rolePermission.findMany(),
    prisma.user.findMany(),
    prisma.customer.findMany(),
    prisma.contact.findMany(),
    prisma.shippingDetail.findMany(),
    prisma.serviceProvider.findMany(),
    prisma.onboardingDocument.findMany(),
    prisma.timeExtensionRequest.findMany(),
    prisma.fieldChangeRequest.findMany(),
    prisma.customerHistoryEntry.findMany(),
    prisma.weeklyPlan.findMany(),
    prisma.visit.findMany(),
    prisma.dailyReport.findMany(),
    prisma.reportVisit.findMany(),
    prisma.notification.findMany(),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50000 }),
    prisma.loginLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50000 }),
  ]);

  const files: BackupFile[] = [];
  let filesTruncated = false;
  if (includeFiles) {
    let running = 0;
    try {
      const names = await fs.readdir(uploadDir());
      for (const name of names) {
        // eslint-disable-next-line no-await-in-loop
        const stat = await fs.stat(path.join(uploadDir(), name)).catch(() => null);
        if (!stat?.isFile()) continue;
        if (running + stat.size > MAX_EMBEDDED_FILES_BYTES) {
          filesTruncated = true;
          files.push({ storageKey: name, sizeBytes: stat.size });
          continue;
        }
        // eslint-disable-next-line no-await-in-loop
        const buf = await fs.readFile(path.join(uploadDir(), name));
        files.push({ storageKey: name, sizeBytes: stat.size, contentBase64: buf.toString('base64') });
        running += stat.size;
      }
    } catch {
      /* no upload directory yet */
    }
  }

  logAudit({ entity: 'System', entityId: 'backup', action: 'BACKUP_CREATED', actorId, afterState: { includeFiles, filesTruncated } }).catch(() => {});

  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    includesFiles: includeFiles,
    filesTruncated,
    data: {
      roles, permissions, rolePermissions, users, customers, contacts, shippingDetails,
      serviceProviders, onboardingDocuments, timeExtensionRequests, fieldChangeRequests,
      customerHistory, weeklyPlans, visits, dailyReports, reportVisits, notifications, auditLogs, loginLogs,
    },
    files,
  };
};

const CONFIRM_PHRASE = 'RESTORE';

// Destructive by definition: the current contents are replaced with the
// snapshot. Guarded by an explicit typed confirmation so it can never be
// triggered by a stray click or a replayed request.
export const restoreBackup = async (payload: any, confirm: string, actorId: string) => {
  if (confirm !== CONFIRM_PHRASE) {
    throw { statusCode: 400, code: 'CONFIRMATION_REQUIRED', message: `To restore, type ${CONFIRM_PHRASE} exactly as shown to confirm.` };
  }
  if (!payload || payload.version !== BACKUP_VERSION || !payload.data) {
    throw { statusCode: 400, code: 'INVALID_BACKUP', message: 'This file isn\'t a valid Milex backup, or it was made by a different version.' };
  }

  const d = payload.data;
  const required = ['roles', 'permissions', 'users', 'customers'];
  for (const key of required) {
    if (!Array.isArray(d[key])) {
      throw { statusCode: 400, code: 'INVALID_BACKUP', message: 'This backup file looks incomplete or damaged. Please use a different one.' };
    }
  }

  await prisma.$transaction(
    async (tx) => {
      // Delete children before parents so no foreign key is ever orphaned.
      await tx.reportVisit.deleteMany({});
      await tx.dailyReport.deleteMany({});
      await tx.visit.deleteMany({});
      await tx.weeklyPlan.deleteMany({});
      await tx.customerHistoryEntry.deleteMany({});
      await tx.fieldChangeRequest.deleteMany({});
      await tx.timeExtensionRequest.deleteMany({});
      await tx.onboardingDocument.deleteMany({});
      await tx.shippingDetail.deleteMany({});
      await tx.contact.deleteMany({});
      await tx.customer.deleteMany({});
      await tx.notification.deleteMany({});
      await tx.notificationRead.deleteMany({});
      await tx.auditLog.deleteMany({});
      await tx.loginLog.deleteMany({});
      await tx.refreshToken.deleteMany({});
      await tx.passwordResetToken.deleteMany({});
      await tx.rolePermission.deleteMany({});
      await tx.user.deleteMany({});
      await tx.serviceProvider.deleteMany({});
      await tx.permission.deleteMany({});
      await tx.role.deleteMany({});

      await tx.role.createMany({ data: d.roles, skipDuplicates: true });
      await tx.permission.createMany({ data: d.permissions, skipDuplicates: true });
      await tx.rolePermission.createMany({ data: d.rolePermissions || [], skipDuplicates: true });
      await tx.serviceProvider.createMany({ data: d.serviceProviders || [], skipDuplicates: true });

      // Users reference themselves through lineManagerId, so insert with
      // that link cleared and re-apply it once every row exists.
      await tx.user.createMany({
        data: d.users.map((u: any) => ({ ...u, lineManagerId: null })),
        skipDuplicates: true,
      });
      for (const u of d.users.filter((x: any) => x.lineManagerId)) {
        // eslint-disable-next-line no-await-in-loop
        await tx.user.update({ where: { id: u.id }, data: { lineManagerId: u.lineManagerId } });
      }

      await tx.customer.createMany({ data: d.customers, skipDuplicates: true });
      await tx.contact.createMany({ data: d.contacts || [], skipDuplicates: true });
      await tx.shippingDetail.createMany({ data: d.shippingDetails || [], skipDuplicates: true });
      await tx.onboardingDocument.createMany({ data: d.onboardingDocuments || [], skipDuplicates: true });
      await tx.timeExtensionRequest.createMany({ data: d.timeExtensionRequests || [], skipDuplicates: true });
      await tx.fieldChangeRequest.createMany({ data: d.fieldChangeRequests || [], skipDuplicates: true });
      await tx.customerHistoryEntry.createMany({ data: d.customerHistory || [], skipDuplicates: true });
      await tx.weeklyPlan.createMany({ data: d.weeklyPlans || [], skipDuplicates: true });
      await tx.visit.createMany({ data: d.visits || [], skipDuplicates: true });
      await tx.dailyReport.createMany({ data: d.dailyReports || [], skipDuplicates: true });
      await tx.reportVisit.createMany({ data: d.reportVisits || [], skipDuplicates: true });
      await tx.notification.createMany({ data: d.notifications || [], skipDuplicates: true });
      await tx.auditLog.createMany({ data: d.auditLogs || [], skipDuplicates: true });
      await tx.loginLog.createMany({ data: d.loginLogs || [], skipDuplicates: true });
    },
    { timeout: 300000, maxWait: 30000 }
  );

  let filesRestored = 0;
  if (Array.isArray(payload.files) && payload.files.length > 0) {
    await fs.mkdir(uploadDir(), { recursive: true, mode: 0o750 });
    for (const f of payload.files as BackupFile[]) {
      if (!f.contentBase64) continue;
      const safeName = path.basename(f.storageKey);
      // eslint-disable-next-line no-await-in-loop
      await fs.writeFile(path.join(uploadDir(), safeName), Buffer.from(f.contentBase64, 'base64'), { mode: 0o640 });
      filesRestored += 1;
    }
  }

  await logAudit({ entity: 'System', entityId: 'restore', action: 'BACKUP_RESTORED', actorId, afterState: { filesRestored, createdAt: payload.createdAt } });

  return { restored: true, filesRestored, backupCreatedAt: payload.createdAt };
};