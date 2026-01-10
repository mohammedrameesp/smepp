/**
 * @file pagination.ts
 * @description Pagination utilities for database queries.
 *              Used across all list endpoints for consistent pagination handling.
 * @module db
 */

/**
 * Calculate skip and take for Prisma queries
 */
export function calculatePagination(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Build standard pagination response
 */
export function buildPaginationResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: page * pageSize < total,
    },
  };
}

/**
 * Build pagination metadata only
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number
) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    hasMore: page * pageSize < total,
    hasLess: page > 1,
  };
}

/**
 * Default pagination options
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;

/**
 * Normalize pagination parameters
 */
export function normalizePagination(
  page?: number | string,
  pageSize?: number | string
): { page: number; pageSize: number } {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(MIN_PAGE_SIZE, Number(pageSize) || DEFAULT_PAGE_SIZE)
  );

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
}

/**
 * Build orderBy clause for Prisma
 */
export function buildOrderBy(
  sort?: string,
  order: 'asc' | 'desc' = 'desc',
  defaultSort: string = 'createdAt'
): Record<string, 'asc' | 'desc'> {
  const sortField = sort || defaultSort;
  return { [sortField]: order };
}

/**
 * Build nested orderBy for related fields
 * e.g., buildNestedOrderBy('member', 'name', 'asc') => { member: { name: 'asc' } }
 */
export function buildNestedOrderBy(
  relation: string,
  field: string,
  order: 'asc' | 'desc' = 'asc'
): Record<string, Record<string, 'asc' | 'desc'>> {
  return { [relation]: { [field]: order } };
}

/**
 * Extract pagination from URL search params
 */
export function extractPaginationFromUrl(
  searchParams: URLSearchParams
): { page: number; pageSize: number; sort?: string; order: 'asc' | 'desc' } {
  const { page, pageSize } = normalizePagination(
    searchParams.get('p') ?? searchParams.get('page') ?? undefined,
    searchParams.get('ps') ?? searchParams.get('pageSize') ?? undefined
  );

  const sort = searchParams.get('sort') ?? undefined;
  const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc';

  return { page, pageSize, sort, order };
}

/**
 * Type for pagination response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Type for cursor-based pagination
 */
export interface CursorPaginationParams {
  cursor?: string;
  take: number;
  direction?: 'forward' | 'backward';
}

/**
 * Build cursor pagination for Prisma
 */
export function buildCursorPagination(params: CursorPaginationParams) {
  const { cursor, take, direction = 'forward' } = params;

  return {
    take: direction === 'backward' ? -take : take,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  };
}

/**
 * Build cursor pagination response
 */
export function buildCursorResponse<T extends { id: string }>(
  items: T[],
  take: number
) {
  const hasMore = items.length === take;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  const prevCursor = items.length > 0 ? items[0].id : null;

  return {
    items,
    cursors: {
      next: nextCursor,
      prev: prevCursor,
      hasMore,
    },
  };
}
