// src/Pages/modules/sales/services/customerService.js — REPLACE ENTIRE FILE
import { request } from '../../../../Components/services/api';

export const fetchCustomers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const { data } = await request(`/customers${query ? `?${query}` : ''}`);
  return data.items;
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

export const uploadOnboardingDocuments = async (customerId, documentType, files) => {
  const formData = new FormData();
  formData.append('documentType', documentType);
  files.forEach((file) => formData.append('files', file));
  const csrfToken = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1];
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'}/onboarding/${customerId}/documents`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrfToken ? { 'x-csrf-token': decodeURIComponent(csrfToken) } : {}),
      },
      body: formData,
    }
  );
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json?.error?.message || 'Upload failed');
  return json.data.documents;
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