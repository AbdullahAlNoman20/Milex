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

// Work week runs Saturday → Friday. Uses local date parts (not
// toISOString(), which converts to UTC first and can shift the date back a
// day in UTC+ timezones like Bangladesh).
const toLocalISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 6 ? 0 : -(day + 1);
  d.setDate(d.getDate() + diff);
  return toLocalISODate(d);
};

export const getWeekEnd = (weekStartDate) => {
  const d = new Date(weekStartDate);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
};

export const getNextWeekStart = (date = new Date()) => {
  const current = new Date(getWeekStart(date));
  current.setDate(current.getDate() + 7);
  return current.toISOString().slice(0, 10);
};

export const formatDateRange = (start, end) => {
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  return `${new Date(start).toLocaleDateString(undefined, opts)} — ${new Date(end).toLocaleDateString(undefined, opts)}`;
};

export const buildEmptyVisit = (date = new Date().toISOString().slice(0, 10)) => ({
  id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  day: date, // holds an ISO date string ("YYYY-MM-DD"), not a weekday name
  customerName: '',
  purpose: '',
  outcomeNotes: '',
  completed: false,
});