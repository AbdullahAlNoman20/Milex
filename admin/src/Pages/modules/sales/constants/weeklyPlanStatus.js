// src/Pages/modules/sales/constants/weeklyPlanStatus.js
import { todayLocalISO } from '../../../../Components/utils/date';
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

// Work week runs Saturday → Friday. All "today"-style dates below use
// todayLocalISO() (local timezone) instead of Date#toISOString() (always
// UTC) — in UTC+6 that silently rolled the date back by one for hours
// after local midnight, which is exactly why the picker showed yesterday.
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = day === 6 ? 0 : -(day + 1);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return todayLocalISO(d);
};

export const getWeekEnd = (weekStartDate) => {
  const d = new Date(weekStartDate);
  d.setDate(d.getDate() + 6);
  return todayLocalISO(d);
};

export const getNextWeekStart = (date = new Date()) => {
  const current = new Date(getWeekStart(date));
  current.setDate(current.getDate() + 7);
  return todayLocalISO(current);
};

export const formatDateRange = (start, end) => {
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  return `${new Date(start).toLocaleDateString(undefined, opts)} — ${new Date(end).toLocaleDateString(undefined, opts)}`;
};

export const buildEmptyVisit = (date = todayLocalISO()) => ({
  id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  day: date, // holds an ISO date string ("YYYY-MM-DD"), not a weekday name
  customerName: '',
  customerId: null,
  purpose: '',
  outcomeNotes: '',
  completed: false,
});