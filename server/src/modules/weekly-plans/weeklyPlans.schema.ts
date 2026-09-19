// src/modules/weekly-plans/weeklyPlans.schema.ts
import { z } from 'zod';

const visitSchema = z
  .object({
    // Present for rows that already exist in the database, null for newly
    // added ones — lets the server update in place and keep visit ids stable.
    id: z.string().max(100).optional().nullable(),
    // Calendar-based scheduling now — this is an ISO date ("YYYY-MM-DD"),
    // not a weekday name.
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid date.'),
    customerName: z.string().min(1, 'Please enter the customer name.').max(200),
    customerId: z.string().max(100).optional().nullable(),
    purpose: z.string().min(1, 'Please describe the purpose of this visit.').max(300),
    // The server sends this back as null for a visit with no daily-report
    // entry yet, so the same shape has to be accepted on the way in.
    outcomeNotes: z.string().max(500).optional().nullable(),
  })
  .strict();

export const upsertPlanSchema = z
  .object({
    weekStartDate: z.string().min(1).max(20),
    existingVisits: z.array(visitSchema),
    prospectVisits: z.array(visitSchema),
    // When the client last read this plan. Anything created on the server
    // after that moment is something the person never saw, so their save
    // leaves it alone instead of deleting it.
    loadedAt: z.string().datetime().optional(),
  })
  .strict();

export const reviewPlanSchema = z
  .object({
    approved: z.boolean(),
    comments: z.string().max(1000).optional(),
  })
  .strict();

export const submitPlanSchema = z
  .object({ weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid week.') })
  .strict();