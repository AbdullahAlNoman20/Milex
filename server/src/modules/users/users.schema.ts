// src/modules/users/users.schema.ts
import { z } from 'zod';

export const createUserSchema = z
  .object({
    name: z.string().min(2).max(150),
    email: z.string().email().max(254),
    password: z.string().min(8).max(200),
    role: z.enum(['KAM', 'SALES_COORDINATOR', 'LINE_MANAGER', 'SUPER_ADMIN']),
    branchId: z.string().max(100).optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: z.string().min(2).max(150).optional(),
    isActive: z.boolean().optional(),
    role: z.enum(['KAM', 'SALES_COORDINATOR', 'LINE_MANAGER', 'SUPER_ADMIN']).optional(),
  })
  .strict();