// src/modules/weekly-plans/weeklyPlans.schema.ts
import { z } from 'zod';

const visitSchema = z
  .object({
    day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
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