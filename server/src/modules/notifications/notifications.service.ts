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

// CRITICAL FOR SPEED: the realtime socket push happens FIRST, synchronously,
// before the database write even starts. A previous version of this system
// only ever did the socket push (no persisted table existed at all), which
// is why it felt instant — persisting to the database is valuable for
// history/7-day-retention/badge-counts, but it must NEVER sit in the
// critical path of the live push, since even a fast DB commit adds real,
// perceptible delay once you're on a VPS. Emitting first and persisting
// second/in-parallel restores that original instant feel while still
// keeping everything stored correctly.
export const createNotificationsForUsers = async (userIds: string[], data: NotificationInput): Promise<void> => {
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  // 1) Fire the live push immediately — this call is synchronous (no
  // network/DB round trip involved), so nothing before this point should
  // ever be an `await` that could delay it.
  try {
    uniqueIds.forEach((id) => emitNotificationToUser(id));
  } catch (err) {
    console.warn('[notifications] Failed to emit realtime notification (non-fatal):', (err as Error)?.message);
  }

  // 2) Persist afterward. This can take a little time on a busy VPS, but
  // since the live push already went out above, that time no longer
  // delays what the user sees/hears.
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
  } catch (err) {
    console.error(
      '[notifications] Failed to save notification to the database. ' +
        'If this keeps happening, check that the "add_notifications" Prisma migration has been applied and the Prisma Client was regenerated:',
      (err as Error)?.message,
    );
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