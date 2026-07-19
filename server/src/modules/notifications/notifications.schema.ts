// server/src/modules/notifications/notifications.schema.ts 
import { z } from 'zod';

export const markAllReadSchema = z.object({ ids: z.array(z.string()).max(500) }).strict();