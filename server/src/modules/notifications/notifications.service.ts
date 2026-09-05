// server/src/modules/notifications/notifications.service.ts — FULL REPLACE
import { prisma } from '../../config/db';
import { emitNotificationToUser } from '../../config/socket';

const NOTIFICATION_RETENTION_DAYS = 7;

export interface NotificationInput {
  label: string;
  link: string;
  isOverdue?: boolean;
  type?: string;
}

// Central place every workflow action calls to (a) persist a real
// notification row per recipient and (b) push the realtime socket ping that
// triggers the bell + sound on the frontend. Never blocks/throws into the
// caller's main operation — a notification failure must never break the
// actual business action.
export const createNotificationsForUsers = async (userIds: string[], data: NotificationInput): Promise<void> => {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        type: data.type || 'WORKFLOW',
        label: data.label.slice(0, 300),
        link: data.link,
        isOverdue: !!data.isOverdue,
      })),
    });
    uniqueIds.forEach((id) => emitNotificationToUser(id));
  } catch (err) {
    console.warn('[notifications] createNotificationsForUsers failed (non-fatal):', (err as Error)?.message);
  }
};

export const getNotificationsForUser = async (userId: string, _role: string, limit = 8) => {
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, createdAt: { gte: cutoff } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, createdAt: { gte: cutoff }, isRead: false } }),
  ]);

  return {
    items: items.map((n) => ({
      id: n.id,
      label: n.label,
      link: n.link,
      isOverdue: n.isOverdue,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
    unreadCount,
  };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
};

export const markNotificationsRead = async (userId: string, ids: string[]) => {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({ where: { id: { in: ids }, userId }, data: { isRead: true } });
};