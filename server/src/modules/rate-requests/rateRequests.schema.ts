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

export const decideRateRequestSchema = z
  .object({
    approve: z.boolean(),
    grantedRate: z.string().max(300).optional(),
    grantedNote: z.string().max(1000).optional(),
  })
  .strict()
  .refine((v) => !v.approve || (v.grantedRate && v.grantedRate.trim().length > 0), {
    message: 'Please enter the rate you are granting.',
    path: ['grantedRate'],
  });