/**
 * @file search-filter.ts
 * @description Database search filter utilities - provides reusable patterns
 *              for building Prisma WHERE clauses with case-insensitive search
 * @module lib/db
 */

export type SearchableField = string;

export interface SearchFilterOptions {
  searchTerm?: string | null;
  searchFields: SearchableField[];
  caseSensitive?: boolean;
}

/**
 * Build a Prisma WHERE clause for case-insensitive search across multiple fields
 *
 * @example
 * const where = buildSearchFilter({
 *   searchTerm: 'laptop',
 *   searchFields: ['model', 'brand', 'assetTag']
 * });
 * // Returns: { OR: [{ model: { contains: 'laptop', mode: 'insensitive' } }, ...] }
 */
export function buildSearchFilter(options: SearchFilterOptions): Record<string, unknown> {
  const { searchTerm, searchFields, caseSensitive = false } = options;

  if (!searchTerm || searchTerm.trim() === '') {
    return {};
  }

  const trimmedTerm = searchTerm.trim();

  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: trimmedTerm,
        mode: caseSensitive ? 'default' : 'insensitive',
      },
    })),
  };
}

/**
 * Merge multiple where clauses with AND logic
 *
 * @example
 * const where = mergeWhereAnd(
 *   buildSearchFilter({ searchTerm: 'laptop', searchFields: ['model'] }),
 *   { status: 'IN_USE' },
 *   { categoryId: '123' }
 * );
 */
export function mergeWhereAnd(...conditions: Record<string, unknown>[]): Record<string, unknown> {
  const validConditions = conditions.filter(
    (condition) => condition && Object.keys(condition).length > 0
  );

  if (validConditions.length === 0) return {};
  if (validConditions.length === 1) return validConditions[0];

  return {
    AND: validConditions,
  };
}

/**
 * Build a WHERE clause for filtering by multiple criteria with search
 *
 * @example
 * const where = buildFilterWithSearch({
 *   searchTerm: 'laptop',
 *   searchFields: ['model', 'brand'],
 *   filters: {
 *     status: 'IN_USE',
 *     assignedUserId: '123'
 *   }
 * });
 */
export function buildFilterWithSearch(options: {
  searchTerm?: string | null;
  searchFields: SearchableField[];
  filters?: Record<string, unknown>;
  caseSensitive?: boolean;
}): Record<string, unknown> {
  const { searchTerm, searchFields, filters, caseSensitive } = options;

  const searchWhere = buildSearchFilter({
    searchTerm,
    searchFields,
    caseSensitive,
  });

  return mergeWhereAnd(searchWhere, filters || {});
}
