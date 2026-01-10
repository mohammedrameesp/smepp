/**
 * @file use-client-data-table.ts
 * @description Hook for client-side data tables with filtering, sorting, and search
 * @module hooks
 */

'use client';

import { useState, useMemo, useCallback } from 'react';

export interface UseClientDataTableOptions<T, TFilters extends Record<string, string | string[]>> {
  /**
   * Source data array
   */
  data: T[];

  /**
   * Fields to search in (uses string includes)
   */
  searchFields?: (keyof T)[];

  /**
   * Default sort field
   */
  defaultSort?: keyof T;

  /**
   * Default sort order
   */
  defaultOrder?: 'asc' | 'desc';

  /**
   * Initial filter values
   */
  initialFilters?: Partial<TFilters>;

  /**
   * Custom filter function (called for each filter key/value)
   */
  filterFn?: (item: T, filterKey: string, filterValue: string | string[]) => boolean;

  /**
   * Custom sort function
   */
  sortFn?: (a: T, b: T, sortBy: keyof T, sortOrder: 'asc' | 'desc') => number;
}

export interface UseClientDataTableReturn<T, TFilters extends Record<string, string | string[]>> {
  // Data
  filteredData: T[];
  totalCount: number;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;

  // Filters
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  resetFilters: () => void;

  // Sorting
  sortBy: keyof T | null;
  sortOrder: 'asc' | 'desc';
  toggleSort: (column: keyof T) => void;
  setSort: (field: keyof T, order: 'asc' | 'desc') => void;

  // Utilities
  getUniqueValues: <K extends keyof T>(field: K) => T[K][];
}

/**
 * Hook for client-side data tables with filtering, sorting, and search.
 * Processes data in-memory using useMemo for performance.
 *
 * @example
 * ```tsx
 * const {
 *   filteredData,
 *   searchTerm,
 *   setSearchTerm,
 *   filters,
 *   setFilter,
 *   sortBy,
 *   sortOrder,
 *   toggleSort,
 *   getUniqueValues,
 * } = useClientDataTable({
 *   data: suppliers,
 *   searchFields: ['name', 'category', 'suppCode'],
 *   defaultSort: 'name',
 *   initialFilters: { status: 'all', category: 'all' },
 * });
 *
 * const categories = getUniqueValues('category');
 * ```
 */
export function useClientDataTable<T, TFilters extends Record<string, string | string[]> = Record<string, string>>(
  options: UseClientDataTableOptions<T, TFilters>
): UseClientDataTableReturn<T, TFilters> {
  const {
    data,
    searchFields = [],
    defaultSort,
    defaultOrder = 'asc',
    initialFilters = {} as Partial<TFilters>,
    filterFn,
    sortFn,
  } = options;

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFiltersState] = useState<TFilters>(initialFilters as TFilters);
  const [sortBy, setSortBy] = useState<keyof T | null>(defaultSort ?? null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultOrder);

  // Default filter function
  const defaultFilterFn = useCallback(
    (item: T, filterKey: string, filterValue: string | string[]): boolean => {
      const itemValue = item[filterKey as keyof T];

      if (Array.isArray(filterValue)) {
        // Multi-select filter
        if (filterValue.length === 0) return true;
        return filterValue.includes(String(itemValue));
      }

      // Single value filter
      if (!filterValue || filterValue === 'all') return true;
      return String(itemValue) === filterValue;
    },
    []
  );

  // Default sort function
  const defaultSortFn = useCallback(
    (a: T, b: T, sortField: keyof T, order: 'asc' | 'desc'): number => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return order === 'asc' ? 1 : -1;
      if (bValue == null) return order === 'asc' ? -1 : 1;

      // String comparison (case-insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return order === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return order === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Fallback to string comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr);
      return order === 'asc' ? comparison : -comparison;
    },
    []
  );

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm && searchFields.length > 0) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field];
          return value != null && String(value).toLowerCase().includes(term);
        })
      );
    }

    // Apply filters
    const activeFilterFn = filterFn || defaultFilterFn;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        result = result.filter((item) => activeFilterFn(item, key, value as string | string[]));
      }
    });

    // Apply sorting
    if (sortBy) {
      const activeSortFn = sortFn || defaultSortFn;
      result.sort((a, b) => activeSortFn(a, b, sortBy, sortOrder));
    }

    return result;
  }, [data, searchTerm, searchFields, filters, sortBy, sortOrder, filterFn, sortFn, defaultFilterFn, defaultSortFn]);

  // Filter handlers
  const setFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<TFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters as TFilters);
    setSearchTerm('');
  }, [initialFilters]);

  // Sort handlers
  const toggleSort = useCallback((column: keyof T) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const setSort = useCallback((field: keyof T, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  // Utility to get unique values for a field (for filter dropdowns)
  const getUniqueValues = useCallback(
    <K extends keyof T>(field: K): T[K][] => {
      const values = new Set<T[K]>();
      data.forEach((item) => {
        const value = item[field];
        if (value != null && value !== '') {
          values.add(value);
        }
      });
      return Array.from(values).sort((a, b) => {
        if (typeof a === 'string' && typeof b === 'string') {
          return a.localeCompare(b);
        }
        return String(a).localeCompare(String(b));
      });
    },
    [data]
  );

  return {
    filteredData,
    totalCount: filteredData.length,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    sortBy,
    sortOrder,
    toggleSort,
    setSort,
    getUniqueValues,
  };
}
