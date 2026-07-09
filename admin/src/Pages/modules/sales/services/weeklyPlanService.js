// src/Pages/modules/sales/services/weeklyPlanService.js
// NOTE: localStorage-backed for now. Replace internals with real API calls
// (via src/Components/services/api.js `request`) once server/routes/weeklyPlans.js exists.
import { WEEKLY_PLAN_STATUS } from '../constants/weeklyPlanStatus';

const STORAGE_KEY = 'milex_weekly_plans';
const MAX_PLANS_CACHED = 500;

const readAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (plans) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans.slice(-MAX_PLANS_CACHED)));
    return true;
  } catch {
    return false;
  }
};

export const listPlansForKam = (kamId) => readAll().filter((p) => p.kamId === kamId);

export const listPlansForReview = () =>
  readAll().filter((p) => p.status === WEEKLY_PLAN_STATUS.SUBMITTED);

export const listAllPlans = () => readAll();

export const getPlan = (id) => readAll().find((p) => p.id === id) || null;

export const savePlan = (plan) => {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === plan.id);
  const stamped = { ...plan, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = stamped;
  else all.push({ ...stamped, createdAt: stamped.updatedAt });
  return writeAll(all) ? stamped : null;
};

export const submitPlan = (id) => {
  const plan = getPlan(id);
  if (!plan) return null;
  return savePlan({ ...plan, status: WEEKLY_PLAN_STATUS.SUBMITTED, lmComments: '' });
};

export const reviewPlan = (id, { approved, comments }) => {
  const plan = getPlan(id);
  if (!plan) return null;
  return savePlan({
    ...plan,
    status: approved ? WEEKLY_PLAN_STATUS.APPROVED : WEEKLY_PLAN_STATUS.NEEDS_REVISION,
    lmComments: typeof comments === 'string' ? comments.slice(0, 1000) : '',
    reviewedAt: new Date().toISOString(),
  });
};