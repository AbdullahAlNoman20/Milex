// server/test/unit/reportsExport.schema.test.ts
import { requestExportSchema } from '../../src/modules/reports-export/reportsExport.schema';

describe('requestExportSchema', () => {
  it('accepts the filters the customer list itself uses', () => {
    expect(() =>
      requestExportSchema.parse({ reportType: 'customers', filters: { group: 'all', search: 'acme' } })
    ).not.toThrow();
  });

  it('rejects an arbitrary Prisma where clause', () => {
    // The export endpoint used to pass the request body straight into
    // findMany({ where }), so this payload dumped the whole table.
    expect(() =>
      requestExportSchema.parse({ reportType: 'customers', filters: { handledById: { not: 'x' } } })
    ).toThrow();
  });

  it('rejects an unknown report type', () => {
    expect(() => requestExportSchema.parse({ reportType: 'users' })).toThrow();
  });
});