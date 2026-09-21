// admin/src/Pages/modules/sales/services/userAdminService.js
import { request } from '../../../../Components/services/api';

// Server-side paged, searched and filtered. The console used to pull the
// whole directory in one request, which put a hard ceiling on how many
// accounts could ever be seen.
export const listAllUsers = async ({
  page = 1,
  pageSize = 10,
  search = '',
  role = '',
  status = '',
} = {}) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set('search', search.trim().slice(0, 150));
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  const { data } = await request(`/users?${params.toString()}`);
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: data.total || 0,
    page: data.page || page,
    pageSize: data.pageSize || pageSize,
    totalPages: Math.max(1, data.totalPages || 1),
  };
};

export const getUserStats = async () => {
  const { data } = await request('/users/stats');
  return data;
};

export const listLineManagers = async () => {
  const { data } = await request('/users/line-managers');
  return data.lineManagers;
};

export const createUserAdmin = async (payload) => {
  const { data } = await request('/users', { method: 'POST', body: payload });
  return data.user;
};

export const updateUserAdmin = async (id, payload) => {
  const { data } = await request(`/users/${id}`, { method: 'PATCH', body: payload });
  return data.user;
};

export const bulkImportKams = async (rows, lineManagerId = null) => {
  const { data } = await request('/users/bulk-import', {
    method: 'POST',
    body: { rows, lineManagerId },
  });
  return data;
};

export const setUserPasswordAdmin = async (id, newPassword, requirePasswordChange = true) => {
  const { data } = await request(`/users/${id}/password`, {
    method: 'PATCH',
    body: { newPassword, requirePasswordChange },
  });
  return data;
};