// src/Pages/modules/sales/services/weeklyPlanService.js
import { request } from '../../../../Components/services/api';

export const listPlansForKam = async () => {
  const { data } = await request('/weekly-plans/mine');
  return data.plans;
};

export const listPlansForReview = async () => {
  const { data } = await request('/weekly-plans/review');
  return data.plans;
};

export const listPlansForKamId = async (kamId) => {
  const { data } = await request(`/weekly-plans/kam/${encodeURIComponent(kamId)}`);
  return data.plans;
};

export const savePlan = async (plan) => {
  const { data } = await request('/weekly-plans/draft', {
    method: 'POST',
    body: {
      weekStartDate: plan.weekStartDate,
      // Tells the server how current this view is, so a visit added from the
      // Daily Report while this page sat open is not wiped out by saving it.
      loadedAt: plan.loadedAt || undefined,
      // `id` is sent so the server can update rows in place instead of
      // deleting and recreating them. Recreating changed every visit's id,
      // which silently broke ReportVisit.sourceVisitId and made Daily
      // Report outcomes disappear from Team Reports.
      existingVisits: plan.existingVisits.map(({ id, day, customerName, customerId, purpose, outcomeNotes }) => ({
        id: typeof id === 'string' && !id.startsWith('v_') ? id : null,
        day,
        customerName,
        customerId,
        purpose,
        outcomeNotes,
      })),
      prospectVisits: plan.prospectVisits.map(({ id, day, customerName, customerId, purpose, outcomeNotes }) => ({
        id: typeof id === 'string' && !id.startsWith('v_') ? id : null,
        day,
        customerName,
        customerId,
        purpose,
        outcomeNotes,
      })),
    },
  });
  return data.plan;
};

export const submitPlan = async (weekStartDate) => {
  const { data } = await request('/weekly-plans/submit', { method: 'POST', body: { weekStartDate } });
  return data.plan;
};

export const deletePlan = async (id) => {
  await request(`/weekly-plans/${id}`, { method: 'DELETE' });
};

export const reviewPlan = async (id, { approved, comments }) => {
  const { data } = await request(`/weekly-plans/${id}/review`, {
    method: 'POST',
    body: { approved, comments },
  });
  return data.plan;
};