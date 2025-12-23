import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required').regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, underscores, and hyphens'),
  isActive: z.boolean().default(true),
});

export const updateProjectSchema = createProjectSchema
  .partial()
  .extend({
    // Remove default in updates to preserve existing value
    isActive: z.boolean().optional(),
  });

export const archiveProjectSchema = z.object({
  isActive: z.boolean(),
});

export const projectQuerySchema = z.object({
  isActive: z.string().transform((val) => val === 'true').optional().nullable(),
  p: z.coerce.number().min(1).optional(),
  ps: z.coerce.number().min(1).max(1000).optional(),
  sort: z.enum(['name', 'code', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export type CreateProjectRequest = z.infer<typeof createProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof updateProjectSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
