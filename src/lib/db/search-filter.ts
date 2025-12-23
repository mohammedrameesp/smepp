/**
 * Utilities for building database search filters
 * Provides reusable patterns for common search scenarios
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
export function buildSearchFilter(options: SearchFilterOptions): any {
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
 *   { projectId: '123' }
 * );
 */
export function mergeWhereAnd(...conditions: any[]): any {
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
  filters?: Record<string, any>;
  caseSensitive?: boolean;
}): any {
  const { searchTerm, searchFields, filters, caseSensitive } = options;

  const searchWhere = buildSearchFilter({
    searchTerm,
    searchFields,
    caseSensitive,
  });

  return mergeWhereAnd(searchWhere, filters || {});
}
