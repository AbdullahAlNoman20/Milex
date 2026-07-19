// server/src/modules/notifications/notifications.service.ts
import { prisma } from '../../config/db';
import { CUSTOMER_STATUS } from '../../common/constants/status.constant';
import { humanizeStatus } from '../../common/utils/humanize.util';

export const getNotificationsForUser = async (userId: string, role: string, limit = 8) => {
  const items: { id: string; label: string; link: string; isOverdue?: boolean }[] = [];

  if (role === 'LINE_MANAGER') {
    const pending = await prisma.customer.findMany({
      where: {
        status: {
          in: [
            CUSTOMER_STATUS.PENDING_RATE_APPROVAL,
            CUSTOMER_STATUS.INFO_UPDATE_PENDING_LM_APPROVAL,
            CUSTOMER_STATUS.PROVISIONAL_EXTENSION_REQUESTED,
            CUSTOMER_STATUS.PROVISIONAL_FINAL_REVIEW_PENDING,
          ],
        },
      },
      take: 20,
    });
    pending.forEach((c) => {
      const ageDays = (Date.now() - c.updatedAt.getTime()) / 86400000;
      items.push({
        id: `cust-${c.id}`,
        label: `${c.accountName} — ${humanizeStatus(c.status)}`,
        link: `/app/customers/${c.barcode}`,
        isOverdue: ageDays > 2,
      });
    });

    // Field-edit requests from KAM/SC waiting on this Line Manager's decision.
    const pendingFieldRequests = await prisma.fieldChangeRequest.findMany({
      where: { approved: null },
      include: { customer: { select: { accountName: true, barcode: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    pendingFieldRequests.forEach((r) => {
      const ageDays = (Date.now() - r.createdAt.getTime()) / 86400000;
      items.push({
        id: `fcr-${r.id}`,
        label: `${r.customer.accountName} — Edit Request: ${r.fieldLabel}`,
        link: `/app/customers/${r.customer.barcode}`,
        isOverdue: ageDays > 2,
      });
    });
  }

  if (role === 'KAM') {
    const mine = await prisma.customer.findMany({
      where: {
        handledById: userId,
        status: {
          in: [
            CUSTOMER_STATUS.OFFER_SENT_AWAITING_FEEDBACK,
            CUSTOMER_STATUS.AGREEMENT_SENT_AWAITING_SIGNATURE,
            CUSTOMER_STATUS.PROVISIONAL_DOCS_PENDING,
          ],
        },
      },
      take: 20,
    });
    mine.forEach((c) => {
      const ageDays = (Date.now() - c.updatedAt.getTime()) / 86400000;
      items.push({
        id: `cust-${c.id}`,
        label: `${c.accountName} — ${humanizeStatus(c.status)}`,
        link: `/app/customers/${c.barcode}`,
        isOverdue: ageDays > 2,
      });
    });
  }

  // Any role that can request field edits (KAM/SC) sees the Line Manager's
  // decision on their own requests, with the customer name attached.
  if (role === 'KAM' || role === 'SALES_COORDINATOR') {
    const decided = await prisma.fieldChangeRequest.findMany({
      where: {
        requestedById: userId,
        approved: { not: null },
        decidedAt: { gte: new Date(Date.now() - 3 * 86400000) },
      },
      include: { customer: { select: { accountName: true, barcode: true } } },
      orderBy: { decidedAt: 'desc' },
      take: 20,
    });
    decided.forEach((r) => {
      items.push({
        id: `fcr-decided-${r.id}`,
        label: `${r.customer.accountName} — Edit Request ${r.approved ? 'Approved' : 'Rejected'}: ${r.fieldLabel}`,
        link: `/app/customers/${r.customer.barcode}`,
      });
    });
  }

  const reads = items.length
    ? await prisma.notificationRead.findMany({ where: { userId, notificationId: { in: items.map((i) => i.id) } } })
    : [];
  const readIds = new Set(reads.map((r) => r.notificationId));
  const withRead = items.map((i) => ({ ...i, isRead: readIds.has(i.id) }));
  const unreadCount = withRead.filter((i) => !i.isRead).length;

  return { items: withRead.slice(0, limit), unreadCount };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  await prisma.notificationRead.upsert({
    where: { userId_notificationId: { userId, notificationId } },
    update: {},
    create: { userId, notificationId },
  });
};

export const markNotificationsRead = async (userId: string, ids: string[]) => {
  if (ids.length === 0) return;
  await prisma.notificationRead.createMany({
    data: ids.map((notificationId) => ({ userId, notificationId })),
    skipDuplicates: true,
  });
};