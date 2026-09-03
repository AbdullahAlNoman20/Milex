// src/modules/onboarding/onboarding.schema.ts
import { z } from 'zod';

export const requestExtensionSchema = z
  .object({
    requestedDays: z.number().int('Please enter a whole number of days.').min(1, 'Please request at least 1 day.').max(90, 'The extension request can\'t be more than 90 days.'),
    reason: z.string().min(1, 'Please explain why you need this extension.').max(500),
  })
  .strict();

export const decideExtensionSchema = z
  .object({
    approve: z.boolean(),
    grantedDays: z.number().int().min(1, 'Please grant at least 1 day.').max(90, 'You can\'t grant more than 90 days.').optional(),
  })
  .strict();

export const finalOnboardingDecisionSchema = z
  .object({
    approve: z.boolean(),
    comments: z.string().max(1000).optional(),
  })
  .strict();