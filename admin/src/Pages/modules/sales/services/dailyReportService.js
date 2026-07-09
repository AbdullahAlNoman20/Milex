// src/Pages/modules/sales/services/dailyReportService.js
// NOTE: localStorage-backed placeholder — swap for real API once
// server/routes/dailyReports.js exists.
const STORAGE_KEY = 'milex_daily_reports';
const MAX_REPORTS_CACHED = 1000;

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

const writeAll = (reports) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports.slice(-MAX_REPORTS_CACHED)));
    return true;
  } catch {
    return false;
  }
};

export const listReportsForKam = (kamId) => readAll().filter((r) => r.kamId === kamId);

export const listAllReports = () => readAll();

export const getReportByDate = (kamId, date) =>
  readAll().find((r) => r.kamId === kamId && r.date === date) || null;

export const saveReport = (report) => {
  const all = readAll();
  const idx = all.findIndex((r) => r.id === report.id);
  const stamped = { ...report, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = stamped;
  else all.push({ ...stamped, createdAt: stamped.updatedAt });
  return writeAll(all) ? stamped : null;
};