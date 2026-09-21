// server/src/modules/rate-requests/rateRequests.schema.ts
import { z } from 'zod';

export const createRateRequestSchema = z
  .object({
    reason: z.string().min(1, 'Please say why a different rate is needed.').max(1000),
    // Set when this request exists because the customer turned down the last
    // offer, so the answer can be routed straight back into the offer loop.
    followsRejection: z.boolean().optional(),
  })
  .strict();

// One endpoint for every answer a Line Manager or the Head of Department can
// give: set the rate, pass it up, or decline it.
export const rateDecisionSchema = z
  .object({
    action: z.enum(['SET', 'ESCALATE', 'DECLINE'], { message: 'Please choose a valid action.' }),
    approvedRate: z.string().max(300).optional(),
    reason: z.string().max(1000).optional(),
  })
  .strict()
  .refine((v) => v.action !== 'SET' || (v.approvedRate && v.approvedRate.trim().length > 0), {
    message: 'Please enter the rate you are setting.',
    path: ['approvedRate'],
  })
  .refine((v) => v.action !== 'ESCALATE' || (v.reason && v.reason.trim().length > 0), {
    message: 'Please say what you need from the Head of Department.',
    path: ['reason'],
  });

export const ownerDecisionSchema = z
  .object({
    accept: z.boolean(),
    reason: z.string().max(1000).optional(),
  })
  .strict()
  .refine((v) => v.accept || (v.reason && v.reason.trim().length > 0), {
    message: 'Please say why a better rate is needed.',
    path: ['reason'],
  });