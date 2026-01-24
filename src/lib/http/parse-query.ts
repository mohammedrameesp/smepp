/**
 * @file parse-query.ts
 * @description Query parameter parsing utilities with Zod schema validation
 * @module http
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  normalizePagination,
  DEFAULT_PAGE_SIZE,
} from '@/lib/db/pagination';

/**
 * Common query parameter schema with pagination and search
 */
export const baseQuerySchema = z.object({
  /** Page number (1-indexed) */
  p: z.coerce.number().int().positive().default(1),
  /** Page size */
  ps: z.coerce.number().int().positive().max(100).default(DEFAULT_PAGE_SIZE),
  /** Search query */
  q: z.string().optional(),
  /** Sort field */
  sort: z.string().optional(),
  /** Sort order */
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type BaseQueryParams = z.infer<typeof baseQuerySchema>;

/**
 * Result type for parseQueryParams - a discriminated union
 */
export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError };

/**
 * Parse query parameters from a NextRequest using a Zod schema.
 *
 * @example
 * ```ts
 * const querySchema = baseQuerySchema.extend({
 *   status: z.enum(['active', 'inactive']).optional(),
 * });
 *
 * const result = parseQueryParams(request, querySchema);
 * if (!result.success) {
 *   return invalidQueryResponse(result.error);
 * }
 * const { p, ps, q, status } = result.data;
 * ```
 */
export function parseQueryParams<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): ParseResult<z.infer<T>> {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Parse and validate basic pagination parameters from a request.
 * Simpler alternative when you don't need a custom schema.
 *
 * @example
 * ```ts
 * const { page, pageSize, search, sort, order } = parsePaginationParams(request);
 * ```
 */
export function parsePaginationParams(request: NextRequest): {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  order: 'asc' | 'desc';
} {
  const { searchParams } = new URL(request.url);

  const { page, pageSize } = normalizePagination(
    searchParams.get('p') ?? searchParams.get('page') ?? undefined,
    searchParams.get('ps') ?? searchParams.get('pageSize') ?? undefined
  );

  const search = searchParams.get('q') ?? searchParams.get('search') ?? undefined;
  const sort = searchParams.get('sort') ?? undefined;
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

  return { page, pageSize, search, sort, order };
}

/**
 * Extract a single parameter value with type coercion
 */
export function getQueryParam<T extends string | number | boolean>(
  searchParams: URLSearchParams,
  key: string,
  type: 'string' | 'number' | 'boolean' = 'string',
  defaultValue?: T
): T | undefined {
  const value = searchParams.get(key);

  if (value === null || value === '') {
    return defaultValue;
  }

  switch (type) {
    case 'number': {
      const num = Number(value);
      return (isNaN(num) ? defaultValue : num) as T;
    }
    case 'boolean':
      return (value === 'true' || value === '1') as T;
    default:
      return value as T;
  }
}

/**
 * Extract multiple values for a parameter (e.g., ?status=active&status=pending)
 */
export function getQueryParamArray(
  searchParams: URLSearchParams,
  key: string
): string[] {
  return searchParams.getAll(key).filter(Boolean);
}

/**
 * Create a type-safe query parser for a specific schema.
 * Useful for creating reusable parsers.
 *
 * @example
 * ```ts
 * const parseAssetQuery = createQueryParser(assetQuerySchema);
 *
 * // In your handler:
 * const result = parseAssetQuery(request);
 * ```
 */
export function createQueryParser<T extends z.ZodType>(schema: T) {
  return (request: NextRequest): ParseResult<z.infer<T>> => {
    return parseQueryParams(request, schema);
  };
}
