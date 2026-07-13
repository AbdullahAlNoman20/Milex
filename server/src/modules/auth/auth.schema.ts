// src/modules/auth/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(200),
    mfaToken: z.string().length(6).optional(),
  })
  .strict();

export const refreshSchema = z.object({}).strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email().max(254),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(200),
    newPassword: z.string().min(8).max(200),
  })
  .strict();

export const enableMfaVerifySchema = z
  .object({
    token: z.string().length(6),
  })
  .strict();