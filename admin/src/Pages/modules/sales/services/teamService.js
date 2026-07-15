// admin/src/Pages/modules/sales/services/teamService.js (NEW FILE)
import { request } from '../../../../Components/services/api';

export const listKams = async () => {
  const { data } = await request('/users/kams');
  return data.kams;
};

export const listStaffDirectory = async () => {
  const { data } = await request('/users/directory');
  return data.staff;
};

export const getMyActivity = async () => {
  const { data } = await request('/users/me/activity');
  return data.items;
};

export const getUserActivity = async (userId) => {
  const { data } = await request(`/users/${encodeURIComponent(userId)}/activity`);
  return data.items;
};