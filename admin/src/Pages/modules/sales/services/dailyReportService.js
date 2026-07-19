// src/Pages/modules/sales/services/dailyReportService.js
import { request } from '../../../../Components/services/api';

export const getReportByDate = async (date) => {
  const { data } = await request(`/daily-reports/${date}`);
  return data.report;
};

export const listReportsForKam = async (kamId) => {
  const { data } = await request(`/daily-reports/kam/${encodeURIComponent(kamId)}`);
  return data.reports;
};

export const listMyReports = async () => {
  const { data } = await request('/daily-reports/mine');
  return data.reports;
};

export const saveReport = async (report) => {
  const { data } = await request('/daily-reports', {
    method: 'POST',
    body: {
      date: report.date,
      visits: report.visits.map(({ customerName, completed, reasonIfNotCompleted, outcomeNotes }) => ({
        customerName,
        completed,
        reasonIfNotCompleted,
        outcomeNotes,
      })),
    },
  });
  return data.report;
};