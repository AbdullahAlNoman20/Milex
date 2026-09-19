// admin/src/Pages/modules/sales/services/rateRequestService.js
import { request } from '../../../../Components/services/api';

export const listRateRequests = async (customerId) => {
  const { data } = await request(`/rate-requests/customer/${encodeURIComponent(customerId)}`);
  return data.items;
};

export const createRateRequest = async (customerId, reason, followsRejection = false) => {
  const { data } = await request(`/rate-requests/customer/${encodeURIComponent(customerId)}`, {
    method: 'POST',
    body: { reason, followsRejection },
  });
  return data.request;
};

export const decideRateRequest = async (requestId, { approve, grantedRate, grantedNote }) => {
  const { data } = await request(`/rate-requests/${encodeURIComponent(requestId)}/decision`, {
    method: 'POST',
    body: { approve, grantedRate, grantedNote },
  });
  return data.customer;
};