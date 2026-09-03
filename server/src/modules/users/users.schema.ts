// server/src/modules/users/users.schema.ts
import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(2, 'Please enter a name (at least 2 characters).').max(150),
    email: z.string().email('Please enter a valid email address.').max(254),
    password: z.string().min(8, 'Password must be at least 8 characters long.').max(200),
    role: z.enum(["KAM", "SALES_COORDINATOR", "LINE_MANAGER", "SUPER_ADMIN"], { message: 'Please choose a valid role.' }),
    branchId: z.string().max(100).optional(),
    lineManagerId: z.string().max(100).optional().nullable(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2, 'Please enter a name (at least 2 characters).').max(150).optional(),
    isActive: z.boolean().optional(),
    role: z
      .enum(["KAM", "SALES_COORDINATOR", "LINE_MANAGER", "SUPER_ADMIN"], { message: 'Please choose a valid role.' })
      .optional(),
    lineManagerId: z.string().max(100).optional().nullable(),
  })
  .strict();

export const setPasswordSchema = z
  .object({ newPassword: z.string().min(8, 'Password must be at least 8 characters long.').max(200) })
  .strict();
