/**
 * @file use-server-data-table.ts
 * @description Hook for server-side data tables with pagination, search, filters, and sorting
 * @module hooks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

export interface UseServerDataTableOptions<TFilters extends Record<string, string>> {
  /**
   * API endpoint to fetch data from
   */
  endpoint: string;

  /**
   * Default sort field
   */
  defaultSort?: string;

  /**
   * Default sort order
   */
  defaultOrder?: 'asc' | 'desc';

  /**
   * Default page size
   */
  defaultPageSize?: number;

  /**
   * Initial filter values
   */
  initialFilters?: Partial<TFilters>;

  /**
   * Debounce delay for search (ms)
   */
  debounceDelay?: number;

  /**
   * Key for items in response (default: 'items')
   */
  itemsKey?: string;

  /**
   * Whether to fetch on mount
   */
  fetchOnMount?: boolean;

  /**
   * Transform response data
   */
  transformResponse?: (data: unknown) => { items: unknown[]; pagination: PaginationInfo };
}

export interface UseServerDataTableReturn<T, TFilters extends Record<string, string>> {
  // Data
  items: T[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;

  // Search
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearch: string;

  // Filters
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (filters: Partial<TFilters>) => void;
  resetFilters: () => void;

  // Sorting
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  toggleSort: (column: string) => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;

  // Pagination
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;

  // Actions
  refresh: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for server-side data tables with pagination, search, filters, and sorting.
 * Handles debouncing, loading states, and API communication.
 *
 * @example
 * ```tsx
 * const {
 *   items,
 *   loading,
 *   pagination,
 *   searchTerm,
 *   setSearchTerm,
 *   filters,
 *   setFilter,
 *   sortBy,
 *   sortOrder,
 *   toggleSort,
 *   goToPage,
 * } = useServerDataTable<Asset, { status: string; type: string }>({
 *   endpoint: '/api/assets',
 *   defaultSort: 'createdAt',
 *   defaultPageSize: 50,
 *   initialFilters: { status: 'active', type: 'all' },
 * });
 * ```
 */
export function useServerDataTable<T, TFilters extends Record<string, string> = Record<string, string>>(
  options: UseServerDataTableOptions<TFilters>
): UseServerDataTableReturn<T, TFilters> {
  const {
    endpoint,
    defaultSort = 'createdAt',
    defaultOrder = 'desc',
    defaultPageSize = 20,
    initialFilters = {} as Partial<TFilters>,
    debounceDelay = 300,
    itemsKey = 'items',
    fetchOnMount = true,
    transformResponse,
  } = options;

  // State
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(fetchOnMount);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFiltersState] = useState<TFilters>(initialFilters as TFilters);
  const [sortBy, setSortBy] = useState(defaultSort);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultOrder);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceDelay]);

  // Build URL params
  const buildParams = useCallback(() => {
    const params = new URLSearchParams({
      p: pagination.page.toString(),
      ps: pagination.pageSize.toString(),
      sort: sortBy,
      order: sortOrder,
    });

    if (debouncedSearch) {
      params.append('q', debouncedSearch);
    }

    // Add filters (skip 'all' values)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.append(key, value);
      }
    });

    return params;
  }, [pagination.page, pagination.pageSize, sortBy, sortOrder, debouncedSearch, filters]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = buildParams();
      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      if (transformResponse) {
        const transformed = transformResponse(data);
        setItems(transformed.items as T[]);
        setPagination(transformed.pagination);
      } else {
        // Default handling - look for items under itemsKey or directly
        const responseItems = data[itemsKey] || data.items || data;
        setItems(Array.isArray(responseItems) ? responseItems : []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, buildParams, itemsKey, transformResponse]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (fetchOnMount || debouncedSearch || pagination.page > 1) {
      fetchData();
    }
  }, [fetchData, fetchOnMount, debouncedSearch, pagination.page]);

  // Filter handlers
  const setFilter = useCallback(<K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<TFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters as TFilters);
    setSearchTerm('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [initialFilters]);

  // Sort handlers
  const toggleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const setSort = useCallback((field: string, order: 'asc' | 'desc') => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  // Pagination handlers
  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.hasMore) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.hasMore, pagination.page, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.page, goToPage]);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, page: 1 }));
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    items,
    loading,
    error,
    pagination,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    filters,
    setFilter,
    setFilters,
    resetFilters,
    sortBy,
    sortOrder,
    toggleSort,
    setSort,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    refresh,
    refetch: fetchData,
  };
}
