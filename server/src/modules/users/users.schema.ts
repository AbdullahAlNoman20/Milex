// server/src/modules/users/users.schema.ts
import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(2, 'Please enter a name (at least 2 characters).').max(150),
    email: z.string().email('Please enter a valid email address.').max(254),
    password: z.string().min(8, 'Password must be at least 8 characters long.').max(200),
    // SUPER_ADMIN is deliberately absent: the system ships with its Super
    // Admin already provisioned and no further one may ever be created
    // through the console. The schema is the enforcement point, so this
    // cannot be bypassed by calling the API directly.
    role: z.enum(["KAM", "SALES_COORDINATOR", "LINE_MANAGER"], { message: 'Please choose a valid role.' }),
    branchId: z.string().max(100).optional(),
    lineManagerId: z.string().max(100).optional().nullable(),
    sendWelcomeEmail: z.boolean().optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2, 'Please enter a name (at least 2 characters).').max(150).optional(),
    isActive: z.boolean().optional(),
    // An existing account may not be promoted to Super Admin either — that
    // would be the same thing as creating one.
    role: z
      .enum(["KAM", "SALES_COORDINATOR", "LINE_MANAGER"], { message: 'Please choose a valid role.' })
      .optional(),
    lineManagerId: z.string().max(100).optional().nullable(),
  })
  .strict();

export const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters long.').max(200),
    requirePasswordChange: z.boolean().optional(),
  })
  .strict();


export const bulkImportKamsSchema = z
  .object({
    rows: z
      .array(
        z
          .object({
            name: z.string().max(200),
            email: z.string().max(300),
          })
          .strict()
      )
      .min(1, 'The file didn\'t contain any rows to import.')
      .max(50, 'Please import at most 50 people at a time.'),
    lineManagerId: z.string().max(100).optional().nullable(),
  })
  .strict();
