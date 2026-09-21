// src/jobs/export-report.job.ts
import { listCustomers } from '../modules/customers/customers.service';

const PAGE_SIZE = 1000;
const MAX_EXPORT_ROWS = 200000;

export interface ExportFilters {
  status?: string;
  group?: string;
  search?: string;
}

// Runs synchronously, inline in the request.
//
// The previous version passed the caller's raw request body straight into
// `prisma.customer.findMany({ where: filters })`. That let anyone holding
// EXPORT_DATA craft an arbitrary query and dump the entire customer table —
// every team, every column — regardless of their own scope. Exports now go
// through exactly the same scoped, validated reader the list view uses, so
// the person can only ever export what they were already allowed to see.
export const runExportJob = async (
  reportType: string,
  filters: ExportFilters,
  requester: { id: string; role: string }
) => {
  if (reportType !== 'customers') {
    throw {
      statusCode: 400,
      code: 'UNSUPPORTED_REPORT',
      message: 'That report type isn\'t available for export.',
    };
  }

  const rows: unknown[] = [];
  for (let page = 1; ; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await listCustomers(page, PAGE_SIZE, { ...filters, withCounts: false }, requester);
    rows.push(...result.items);
    if (result.items.length === 0) break;
    if (page >= result.totalPages) break;
    if (rows.length >= MAX_EXPORT_ROWS) break;
  }
  return rows;
};