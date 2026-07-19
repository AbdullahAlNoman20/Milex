// src/modules/weekly-plans/weeklyPlans.schema.ts
import { z } from 'zod';

const visitSchema = z
  .object({
    // Calendar-based scheduling now — this is an ISO date ("YYYY-MM-DD"),
    // not a weekday name.
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
    customerName: z.string().min(1).max(200),
    purpose: z.string().min(1).max(300),
    outcomeNotes: z.string().max(500).optional(),
  })
  .strict();

export const upsertPlanSchema = z
  .object({
    weekStartDate: z.string().min(1).max(20),
    existingVisits: z.array(visitSchema),
    prospectVisits: z.array(visitSchema),
  })
  .strict();

export const reviewPlanSchema = z
  .object({
    approved: z.boolean(),
    comments: z.string().max(1000).optional(),
  })
  .strict();