
import { request } from './api';

export const changePassword = async (currentPassword, newPassword) => {
  const { data } = await request('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
  return data;
};