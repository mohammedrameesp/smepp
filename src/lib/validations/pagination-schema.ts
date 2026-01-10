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
export const basePaginationSchema = z.object({
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type BasePaginationParams = z.infer<typeof basePaginationSchema>;

/**
 * Pagination schema with search
 */
export const searchablePaginationSchema = basePaginationSchema.extend({
  q: z.string().optional(),
});

export type SearchablePaginationParams = z.infer<typeof searchablePaginationSchema>;

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

/**
 * Create a simple filter schema for common patterns
 */
export function createFilterSchema<T extends z.ZodRawShape>(fields: T) {
  return z.object(fields);
}

/**
 * Date range filter schema
 */
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type DateRangeParams = z.infer<typeof dateRangeSchema>;

/**
 * Pagination schema with date range
 */
export const dateRangePaginationSchema = searchablePaginationSchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type DateRangePaginationParams = z.infer<typeof dateRangePaginationSchema>;

/**
 * Common sort options for entities with timestamps
 */
export const COMMON_SORT_OPTIONS = ['createdAt', 'updatedAt', 'name'] as const;

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(
  searchParams: URLSearchParams
): BasePaginationParams {
  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });
  return basePaginationSchema.parse(rawParams);
}

/**
 * Parse searchable pagination params from URL search params
 */
export function parseSearchableParams(
  searchParams: URLSearchParams
): SearchablePaginationParams {
  const rawParams: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    rawParams[key] = value;
  });
  return searchablePaginationSchema.parse(rawParams);
}
