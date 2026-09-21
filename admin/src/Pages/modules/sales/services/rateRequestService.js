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

// One call for every answer a Line Manager or the Head of Department gives:
// set the rate, pass it up, or decline it.
export const decideNewRate = async (customerId, { action, approvedRate, reason }) => {
  const { data } = await request(`/rate-requests/customer/${encodeURIComponent(customerId)}/decision`, {
    method: 'POST',
    body: { action, approvedRate, reason },
  });
  return data.customer;
};

// The account's own holder decides whether the new rate goes to the customer.
export const ownerDecideNewRate = async (customerId, { accept, reason }) => {
  const { data } = await request(`/rate-requests/customer/${encodeURIComponent(customerId)}/owner-decision`, {
    method: 'POST',
    body: { accept, reason },
  });
  return data.customer;
};