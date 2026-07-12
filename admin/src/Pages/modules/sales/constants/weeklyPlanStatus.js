// src/Pages/modules/sales/constants/weeklyPlanStatus.js
export const WEEKLY_PLAN_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  NEEDS_REVISION: 'NEEDS_REVISION',
  APPROVED: 'APPROVED',
});

export const DAYS_OF_WEEK = Object.freeze([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]);

export const VISIT_SECTIONS = Object.freeze({
  EXISTING: 'existing',
  PROSPECT: 'prospect',
});

export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export const getNextWeekStart = (date = new Date()) => {
  const current = new Date(getWeekStart(date));
  current.setDate(current.getDate() + 7);
  return current.toISOString().slice(0, 10);
};

export const buildEmptyVisit = () => ({
  id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  day: DAYS_OF_WEEK[0],
  customerName: '',
  purpose: '',
  outcomeNotes: '',
  completed: false,
});