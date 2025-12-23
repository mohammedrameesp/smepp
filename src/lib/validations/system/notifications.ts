import { z } from 'zod';

/**
 * Query schema for listing notifications with pagination and filtering
 */
export const notificationQuerySchema = z.object({
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
});

export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
