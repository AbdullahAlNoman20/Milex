// admin/src/Components/services/notificationService.js
import { request } from './api';

export const listNotifications = async (limit = 8) => {
    const { data } = await request(`/notifications?limit=${limit}`);
    return data; // { items, count }
};

export const markNotificationRead = async (id) => {
    await request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
};

export const markAllNotificationsRead = async (ids) => {
    await request('/notifications/read-all', { method: 'POST', body: { ids } });
};