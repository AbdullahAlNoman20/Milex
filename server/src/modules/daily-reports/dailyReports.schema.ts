// src/modules/daily-reports/dailyReports.schema.ts
import { z } from 'zod';

const visitEntrySchema = z
  .object({
    customerName: z.string().min(1).max(200),
    completed: z.boolean(),
    reasonIfNotCompleted: z.string().max(500).optional(),
    outcomeNotes: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => v.completed || (v.reasonIfNotCompleted && v.reasonIfNotCompleted.length > 0), {
    message: 'reasonIfNotCompleted is required when a visit is not completed',
  });

export const upsertDailyReportSchema = z
  .object({
    date: z.string().min(1).max(20),
    visits: z.array(visitEntrySchema).min(1),
  })
  .strict();