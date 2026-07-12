// src/Pages/modules/sales/services/weeklyPlanService.js — REPLACE ENTIRE FILE
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
      existingVisits: plan.existingVisits.map(({ day, customerName, purpose, outcomeNotes }) => ({
        day,
        customerName,
        purpose,
        outcomeNotes,
      })),
      prospectVisits: plan.prospectVisits.map(({ day, customerName, purpose, outcomeNotes }) => ({
        day,
        customerName,
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

export const reviewPlan = async (id, { approved, comments }) => {
  const { data } = await request(`/weekly-plans/${id}/review`, {
    method: 'POST',
    body: { approved, comments },
  });
  return data.plan;
};