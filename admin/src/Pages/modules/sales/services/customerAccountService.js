// admin/src/Pages/modules/sales/services/customerAccountService.js
import { request } from '../../../../Components/services/api';

// Customer logins. Paged in the database, so however many customers go live
// every one of them is reachable from this page.
export const listCustomerAccounts = async ({ page = 1, pageSize = 10, search = '' } = {}) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set('search', search.trim().slice(0, 150));
  const { data } = await request(`/users/customer-accounts?${params.toString()}`);
  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: data.total || 0,
    totalPages: Math.max(1, data.totalPages || 1),
  };
};

export const setCustomerAccountEmail = async (id, email) => {
  const { data } = await request(`/users/customer-accounts/${encodeURIComponent(id)}/email`, {
    method: 'PATCH',
    body: { email },
  });
  return data.user;
};