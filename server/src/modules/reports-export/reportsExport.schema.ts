// server/src/modules/reports-export/reportsExport.schema.ts
import { z } from 'zod';

// Nothing reaches the database layer that isn't on this list. The filters
// mirror the customer list's own query parameters exactly.
export const requestExportSchema = z
  .object({
    reportType: z.enum(['customers'], { message: 'Please choose a valid report type.' }),
    filters: z
      .object({
        status: z.string().max(60).optional(),
        group: z.enum(['all', 'customer', 'provisional', 'pending', 'pipeline', 'queue']).optional(),
        search: z.string().max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();