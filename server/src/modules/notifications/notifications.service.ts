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

// ORDER MATTERS: the row is written FIRST, then the socket push goes out.
// The previous version emitted first and wrote afterwards, which created a
// race — the client received the push, immediately re-read the database,
// and the row was not committed yet. The bell stayed empty until the next
// 60-second poll even though the sound had already played.
//
// The write is a single indexed createMany against a local connection pool
// (single-digit milliseconds), so nothing perceptible is lost, and the push
// now carries the notification body with it so the client does not have to
// wait on a second round trip to show it.
//
// This whole function is called fire-and-forget by every caller, so it is
// never on the critical path of the user's own request either way.
export const createNotificationsForUsers = async (userIds: string[], data: NotificationInput): Promise<void> => {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const label = data.label.slice(0, 300);

  try {
    await prisma.notification.createMany({
      data: uniqueIds.map((userId) => ({
        userId,
        type: data.type || 'WORKFLOW',
        label,
        link: data.link,
        isOverdue: !!data.isOverdue,
      })),
    });
  } catch (err) {
    console.error(
      '[notifications] Failed to save notification to the database. ' +
        'If this keeps happening, check that the "add_notifications" Prisma migration has been applied and the Prisma Client was regenerated:',
      (err as Error)?.message,
    );
    // Still push live below — a storage failure should not also cost the
    // person the realtime alert.
  }

  try {
    const payload = { label, link: data.link, isOverdue: !!data.isOverdue, createdAt: new Date().toISOString() };
    uniqueIds.forEach((id) => emitNotificationToUser(id, payload));
  } catch (err) {
    console.warn('[notifications] Failed to emit realtime notification (non-fatal):', (err as Error)?.message);
  }
};

export const getNotificationsForUser = async (userId: string, _role: string, limit = 8) => {
  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
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
  } catch (err) {
    console.error(
      '[notifications] Failed to load notifications from the database. ' +
        'If this keeps happening, check that the "add_notifications" Prisma migration has been applied and the Prisma Client was regenerated:',
      (err as Error)?.message,
    );
    return { items: [], unreadCount: 0 };
  }
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  await prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { isRead: true } });
};

export const markNotificationsRead = async (userId: string, ids: string[]) => {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({ where: { id: { in: ids }, userId }, data: { isRead: true } });
};