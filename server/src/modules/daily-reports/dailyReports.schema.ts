// server/src/modules/daily-reports/dailyReports.schema.ts — REPLACE ENTIRE FILE
import { z } from 'zod';

const visitEntrySchema = z
  .object({
    customerName: z.string().min(1).max(200),
    purpose: z.string().max(300).optional().nullable(),
    completed: z.boolean().nullable(),
    reasonIfNotCompleted: z.string().max(500).optional().nullable(),
    outcomeNotes: z.string().max(500).optional().nullable(),
    sourceVisitId: z.string().max(100).optional().nullable(),
  })
  .strict()
  .refine(
    (v) => v.completed !== false || (v.reasonIfNotCompleted && v.reasonIfNotCompleted.trim().length > 0),
    { message: 'reasonIfNotCompleted is required when a visit is skipped', path: ['reasonIfNotCompleted'] }
  );

export const upsertDailyReportSchema = z
  .object({
    date: z.string().min(1).max(20),
    visits: z.array(visitEntrySchema),
  })
  .strict();