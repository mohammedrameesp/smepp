/**
 * @file pagination-schema.ts
 * @description Pagination and query parameter schemas for API list endpoints.
 *              Provides a factory function to create consistent, type-safe query schemas
 *              with pagination, search, sorting, and custom filters.
 * @module validations
 *
 * @example
 * ```typescript
 * import { createQuerySchema } from '@/lib/validations/pagination-schema';
 *
 * // Create a query schema for suppliers with custom filters
 * const supplierQuerySchema = createQuerySchema({
 *   status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
 *   category: z.string().optional(),
 * }, ['createdAt', 'name', 'status']);
 *
 * // Parse query params from URL
 * const params = supplierQuerySchema.parse(Object.fromEntries(url.searchParams));
 * ```
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default page number */
const DEFAULT_PAGE = 1;

/** Default page size */
const DEFAULT_PAGE_SIZE = 20;

/** Minimum page size allowed */
const MIN_PAGE_SIZE = 1;

/**
 * Maximum page size allowed.
 * Set high (10000) to allow bulk exports while still having a reasonable limit.
 * Individual endpoints can set lower limits if needed.
 */
const MAX_PAGE_SIZE = 10000;

/** Default sort order */
const DEFAULT_SORT_ORDER = 'desc' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// BASE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base pagination schema for all list endpoints.
 * Uses short parameter names (p, ps) for cleaner URLs.
 *
 * @property p - Page number (1-indexed, defaults to 1)
 * @property ps - Page size (defaults to 20, max 10000)
 * @property sort - Field to sort by (optional)
 * @property order - Sort order: 'asc' or 'desc' (defaults to 'desc')
 */
const basePaginationSchema = z.object({
  /** Page number (1-indexed) */
  p: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  /** Page size (number of items per page) */
  ps: z.coerce.number().int().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  /** Field name to sort by */
  sort: z.string().optional(),
  /** Sort direction */
  order: z.enum(['asc', 'desc']).default(DEFAULT_SORT_ORDER),
});

/**
 * Pagination schema with search capability.
 * Extends base pagination with a search query parameter.
 *
 * @property q - Search query string (optional)
 */
const searchablePaginationSchema = basePaginationSchema.extend({
  /** Search query string */
  q: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a query schema with custom filter fields and optional sort field validation.
 *
 * This factory function generates a Zod schema that includes:
 * - Pagination (p, ps)
 * - Sorting (sort, order)
 * - Search (q)
 * - Custom filter fields you specify
 *
 * @template T - Shape of custom filter fields
 * @param fields - Custom filter fields to add to the schema
 * @param sortOptions - Optional array of valid sort field names. If provided,
 *                      the sort field will be validated against this list.
 * @returns A Zod schema that can parse and validate query parameters
 *
 * @example Basic usage with custom filters
 * ```typescript
 * const assetQuerySchema = createQuerySchema({
 *   status: z.enum(['ACTIVE', 'DISPOSED', 'MAINTENANCE']).optional(),
 *   assignedTo: z.string().optional(),
 *   categoryId: z.string().optional(),
 * });
 *
 * // Parses: ?p=1&ps=20&status=ACTIVE&q=laptop
 * ```
 *
 * @example With sort field validation
 * ```typescript
 * const employeeQuerySchema = createQuerySchema({
 *   department: z.string().optional(),
 *   isActive: z.coerce.boolean().optional(),
 * }, ['name', 'dateOfJoining', 'department']);
 *
 * // sort=name is valid, sort=email would fail validation
 * ```
 *
 * @example Using the parsed result
 * ```typescript
 * const schema = createQuerySchema({ status: z.string().optional() });
 * const query = schema.parse({ p: '2', ps: '50', status: 'ACTIVE' });
 * // query = { p: 2, ps: 50, order: 'desc', status: 'ACTIVE' }
 *
 * // Use in Prisma query:
 * const results = await prisma.asset.findMany({
 *   where: query.status ? { status: query.status } : undefined,
 *   skip: (query.p - 1) * query.ps,
 *   take: query.ps,
 *   orderBy: query.sort ? { [query.sort]: query.order } : { createdAt: 'desc' },
 * });
 * ```
 */
export function createQuerySchema<T extends z.ZodRawShape>(
  fields: T,
  sortOptions?: string[]
): z.ZodObject<
  typeof searchablePaginationSchema.shape & T & { sort?: z.ZodOptional<z.ZodEnum<[string, ...string[]]>> }
> {
  const baseSchema = searchablePaginationSchema.extend(fields);

  // If sort options provided, create an enum validator for the sort field
  if (sortOptions && sortOptions.length > 0) {
    return baseSchema.extend({
      sort: z.enum(sortOptions as [string, ...string[]]).optional(),
    }) as z.ZodObject<typeof searchablePaginationSchema.shape & T & { sort: z.ZodOptional<z.ZodEnum<[string, ...string[]]>> }>;
  }

  return baseSchema as z.ZodObject<typeof searchablePaginationSchema.shape & T>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Base pagination parameters type */
export type BasePaginationParams = z.infer<typeof basePaginationSchema>;

/** Searchable pagination parameters type */
export type SearchablePaginationParams = z.infer<typeof searchablePaginationSchema>;

/** Re-export base schema for direct use if needed */
export { basePaginationSchema, searchablePaginationSchema };
