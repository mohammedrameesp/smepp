/**
 * @file pagination-schema.ts
 * @description Pagination schemas for API query parameters.
 *              Used across all list endpoints for consistent pagination.
 * @module validations
 */

import { z } from 'zod';

/**
 * Base pagination schema for all list endpoints.
 * Provides: page, pageSize, sort, order
 */
const basePaginationSchema = z.object({
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(10000).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Pagination schema with search
 */
const searchablePaginationSchema = basePaginationSchema.extend({
  q: z.string().optional(),
});

/**
 * Create a query schema with custom fields and sort options
 *
 * @example
 * ```typescript
 * const supplierQuerySchema = createQuerySchema({
 *   status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
 *   category: z.string().optional(),
 * }, ['createdAt', 'name', 'status']);
 * ```
 */
export function createQuerySchema<T extends z.ZodRawShape>(
  fields: T,
  sortOptions?: string[]
) {
  const baseSchema = searchablePaginationSchema.extend(fields);

  if (sortOptions && sortOptions.length > 0) {
    return baseSchema.extend({
      sort: z.enum(sortOptions as [string, ...string[]]).optional(),
    });
  }

  return baseSchema;
}
