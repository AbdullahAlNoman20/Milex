// src/modules/auth/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z
  .object({
    email: z.string().email('Please enter a valid email address.').max(254),
    password: z.string().min(8, 'Please enter your password.').max(200),
    mfaToken: z.string().length(6, 'Please enter the 6-digit code from your authenticator app.').optional(),
  })
  .strict();
export const refreshSchema = z.object({}).strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().email('Please enter a valid email address.').max(254),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32, 'This reset link looks invalid. Please request a new one.').max(200),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long.').max(200),
  })
  .strict();

export const enableMfaVerifySchema = z
  .object({
    token: z.string().length(6, 'Please enter the 6-digit code from your authenticator app.'),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password.').max(200),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long.').max(200),
  })
  .strict();