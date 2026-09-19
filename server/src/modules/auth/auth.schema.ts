// src/modules/auth/auth.schema.ts
import { z } from 'zod';

// Staff sign in with an email address; a customer signs in with the account
// id printed on their own paperwork. Accepting either here means one field
// and one button serve both, instead of two different login screens.
export const loginSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter your email address or customer ID.')
      .max(254)
      .refine(
        (v) => v.includes('@') || /^MLX[A-Z0-9]{3,20}$/i.test(v.trim()),
        'Please enter a valid email address, or your customer ID.'
      ),
    // A customer's starting password is their own account id, which is
    // shorter than the staff policy allows — the minimum is checked against
    // the stored hash instead, and they are made to replace it on first use.
    password: z.string().min(1, 'Please enter your password.').max(200),
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