// src/modules/onboarding/onboarding.schema.ts
import { z } from 'zod';

export const requestExtensionSchema = z
  .object({
    requestedDays: z.number().int().min(1).max(90),
    reason: z.string().min(1).max(500),
  })
  .strict();

export const decideExtensionSchema = z
  .object({
    approve: z.boolean(),
    grantedDays: z.number().int().min(1).max(90).optional(),
  })
  .strict();

export const finalOnboardingDecisionSchema = z
  .object({
    approve: z.boolean(),
    comments: z.string().max(1000).optional(),
  })
  .strict();