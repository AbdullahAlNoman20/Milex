// admin/src/Pages/modules/sales/services/userAdminService.js
import { request } from '../../../../Components/services/api';

export const listAllUsers = async (page = 1, pageSize = 5000) => {
  const { data } = await request(`/users?page=${page}&pageSize=${pageSize}`);
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