// src/Pages/modules/sales/services/customerService.js
import { request, uploadRequest, API_BASE_URL } from '../../../../Components/services/api';

const PAGE_SIZE = 500;
const MAX_PAGES = 200; // hard ceiling: 100,000 records

// Fetches EVERY customer, not just the first page. The old version asked
// for a single page of 300 and the server capped it there, so record 301
// onward simply vanished from every list, count and dashboard figure.
// Page 1 is fetched first to learn the total, then any remaining pages are
// fetched in parallel batches so the wall-clock time stays flat as the
// database grows.
export const fetchCustomers = async (params = {}) => {
  const buildQuery = (page) =>
    new URLSearchParams({ ...params, page: String(page), pageSize: String(PAGE_SIZE) }).toString();

  const { data: first } = await request(`/customers?${buildQuery(1)}`);
  const items = Array.isArray(first.items) ? [...first.items] : [];
  const totalPages = Math.min(first.totalPages || 1, MAX_PAGES);
  if (totalPages <= 1) return items;

  const remaining = [];
  for (let p = 2; p <= totalPages; p += 1) remaining.push(p);

  const BATCH = 4;
  for (let i = 0; i < remaining.length; i += BATCH) {

    const results = await Promise.all(
      remaining.slice(i, i + BATCH).map((p) =>
        request(`/customers?${buildQuery(p)}`)
          .then((r) => r.data.items || [])
          .catch(() => [])
      )
    );
    results.forEach((chunk) => items.push(...chunk));
  }
  return items;
};

export const fetchCustomerByBarcode = async (barcode) => {
  const { data } = await request(`/customers/${encodeURIComponent(barcode)}`);
  return data.customer;
};

export const createRecommendation = async (payload) => {
  const { data } = await request('/customers', { method: 'POST', body: payload });
  return data.customer;
};

export const approveRate = async (id, payload) => {
  const { data } = await request(`/customers/${id}/approve-rate`, { method: 'POST', body: payload });
  return data.customer;
};

export const rejectRate = async (id) => {
  const { data } = await request(`/customers/${id}/reject-rate`, { method: 'POST' });
  return data.customer;
};

export const draftOffer = async (id) => {
  const { data } = await request(`/customers/${id}/draft-offer`, { method: 'POST' });
  return data.customer;
};

export const finalizeOffer = async (id, offerText) => {
  const { data } = await request(`/customers/${id}/finalize-offer`, { method: 'POST', body: { offerText } });
  return data.customer;
};

export const sendAgreement = async (id, agreementText) => {
  const { data } = await request(`/customers/${id}/send-agreement`, { method: 'POST', body: { agreementText } });
  return data.customer;
};

export const submitClientFeedback = async (id, accepted, rejectReason) => {
  const { data } = await request(`/customers/${id}/client-feedback`, {
    method: 'POST',
    body: { accepted, rejectReason },
  });
  return data.customer;
};

export const reviseRate = async (id, proposedRate) => {
  const { data } = await request(`/customers/${id}/revise-rate`, { method: 'POST', body: { proposedRate } });
  return data.customer;
};

export const draftAgreement = async (id) => {
  const { data } = await request(`/customers/${id}/draft-agreement`, { method: 'POST' });
  return data.customer;
};

export const finalizeAgreement = async (id, agreementText) => {
  const { data } = await request(`/customers/${id}/finalize-agreement`, { method: 'POST', body: { agreementText } });
  return data.customer;
};

export const activateProvisional = async (id) => {
  const { data } = await request(`/customers/${id}/activate-provisional`, { method: 'POST' });
  return data.customer;
};

export const activateDirect = async (id) => {
  const { data } = await request(`/customers/${id}/activate-direct`, { method: 'POST' });
  return data.customer;
};

export const requestInfoUpdate = async (id, field, newValue) => {
  const { data } = await request(`/customers/${id}/request-info-update`, {
    method: 'POST',
    body: { field, newValue },
  });
  return data.customer;
};

export const decideInfoUpdate = async (id, approve) => {
  const { data } = await request(`/customers/${id}/decide-info-update`, { method: 'POST', body: { approve } });
  return data.customer;
};

export const updateFollowUp = async (id, followUpDate, followUpNote) => {
  const { data } = await request(`/customers/${id}/follow-up`, {
    method: 'PATCH',
    body: { followUpDate, followUpNote },
  });
  return data.customer;
};

export const fetchFollowUps = async () => {
  const { data } = await request('/follow-ups');
  return data.items;
};

// --- Onboarding workflow (Section 6) ---

export const uploadOnboardingDocument = async (customerId, { documentType, documentNumber, expiryDate, file }) => {
  const formData = new FormData();
  formData.append('documentType', documentType);
  if (documentNumber) formData.append('documentNumber', documentNumber);
  if (expiryDate) formData.append('expiryDate', expiryDate);
  formData.append('file', file);
  const data = await uploadRequest(`/onboarding/${encodeURIComponent(customerId)}/documents`, formData);
  return data.document;
};

export const requestTimeExtension = async (customerId, requestedDays, reason) => {
  const { data } = await request(`/onboarding/${customerId}/extension-request`, {
    method: 'POST',
    body: { requestedDays, reason },
  });
  return data.request;
};

export const decideTimeExtension = async (requestId, approve, grantedDays) => {
  const { data } = await request(`/onboarding/extension-request/${requestId}/decision`, {
    method: 'POST',
    body: { approve, grantedDays },
  });
  return data.customer;
};

export const submitFinalOnboarding = async (customerId) => {
  const { data } = await request(`/onboarding/${customerId}/final-onboarding`, { method: 'POST' });
  return data.customer;
};

export const decideFinalOnboarding = async (customerId, approve, comments) => {
  const { data } = await request(`/onboarding/${customerId}/final-onboarding/decision`, {
    method: 'POST',
    body: { approve, comments },
  });
  return data.customer;
};

export const generateBarcode = () => `MLX${Math.floor(100000 + Math.random() * 900000)}`;

export const searchCustomers = async (search) => {
  const { data } = await request(`/customers?search=${encodeURIComponent(search)}&pageSize=10`);
  return data.items;
};

export const getDocumentSignedUrl = async (storageKey) => {
  const { data } = await request(`/files/${encodeURIComponent(storageKey)}/signed-url`);
  if (data.url.startsWith('http')) return data.url;
  // Backend returns a path relative to the API's own origin, already
  // including the /api/v1 prefix (e.g. "/api/v1/files/download/...") — so
  // only the scheme+host needs to be prefixed here.
  const apiOrigin = new URL(API_BASE_URL).origin;
  return `${apiOrigin}${data.url}`;
};

export const updateFinalProfile = async (id, payload) => {
  const { data } = await request(`/customers/${id}/final-profile`, { method: 'PATCH', body: payload });
  return data.customer;
};

export const setAccountConfigMode = async (id, mode) => {
  const { data } = await request(`/customers/${id}/account-config-mode`, { method: 'POST', body: { mode } });
  return data.customer;
};

export const submitFinalOnboardingRegular = async (id) => {
  const { data } = await request(`/customers/${id}/final-onboarding-regular`, { method: 'POST' });
  return data.customer;
};

export const requestFieldChange = async (id, fieldKey, newValue, reason) => {
  const { data } = await request(`/customers/${id}/field-change-request`, { method: 'POST', body: { fieldKey, newValue, reason } });
  return data.request;
};

export const requestDocumentChange = async (id, documentType, reason, file) => {
  const formData = new FormData();
  formData.append('documentType', documentType);
  if (reason) formData.append('reason', reason);
  formData.append('file', file);
  const data = await uploadRequest(`/customers/${encodeURIComponent(id)}/field-change-request/document`, formData);
  return data.request;
};

export const getEditableFields = async (scope) => {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : '';
  const { data } = await request(`/customers/editable-fields${query}`);
  return data.fields;
};

export const listFieldChangeRequests = async (id) => {
  const { data } = await request(`/customers/${id}/field-change-request`);
  return data.items;
};

export const decideFieldChangeRequest = async (requestId, approve) => {
  const { data } = await request(`/customers/field-change-request/${requestId}/decision`, { method: 'POST', body: { approve } });
  return data.customer;
};

export const directFieldEdit = async (id, fieldKey, newValue) => {
  const { data } = await request(`/customers/${id}/direct-field-edit`, { method: 'PATCH', body: { fieldKey, newValue } });
  return data.customer;
};

export const deleteCustomer = async (id) => {
  await request(`/customers/${id}`, { method: 'DELETE' });
};

export const reassignCustomer = async (id, newKamId) => {
  const { data } = await request(`/customers/${id}/reassign`, { method: 'POST', body: { newKamId } });
  return data.customer;
};

export const uploadRecommendationAttachment = async (customerId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const data = await uploadRequest(`/customers/${encodeURIComponent(customerId)}/recommendation-attachment`, formData);
  return data.document;
};

export const getCustomerEditHistory = async (id) => {
  const { data } = await request(`/customers/${id}/edit-history`);
  return data.items;
};

export const reapproveRateAfterRejection = async (id, approvedRate, lmNote) => {
  const { data } = await request(`/customers/${id}/reapprove-rate`, { method: 'POST', body: { approvedRate, lmNote } });
  return data.customer;
};