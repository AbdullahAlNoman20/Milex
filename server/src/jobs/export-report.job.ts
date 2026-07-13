// src/jobs/export-report.job.ts
import { prisma } from '../config/db';

// Runs synchronously, inline in the request. The HTTP response now waits
// for the export to finish instead of returning immediately with a job id —
// acceptable for small/medium exports; large ones will hold the connection open.
export const runExportJob = async (reportType: string, filters: Record<string, unknown>) => {
  if (reportType === 'customers') {
    return prisma.customer.findMany({ where: filters as any });
  }
  // Sensitive columns excluded/masked unless explicit permission granted —
  // enforce that in the actual column-selection logic per report type.
  return null;
};