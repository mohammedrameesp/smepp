/**
 * @file use-api-query.ts
 * @description React hook for API queries with retry logic and caching
 * @module hooks
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithRetry, parseApiResponse, ApiError, type RetryOptions } from '@/lib/api/fetch-with-retry';

export interface QueryOptions<TData> {
  /** Whether to fetch data immediately (default: true) */
  enabled?: boolean;
  /** Refetch interval in milliseconds (0 = disabled) */
  refetchInterval?: number;
  /** Whether to refetch when window regains focus */
  refetchOnWindowFocus?: boolean;
  /** Stale time in ms - data is considered fresh for this duration */
  staleTime?: number;
  /** Callback on successful fetch */
  onSuccess?: (data: TData) => void;
  /** Callback on error */
  onError?: (error: ApiError) => void;
  /** Retry options */
  retry?: RetryOptions;
  /** Initial data to use while loading */
  initialData?: TData;
}

export interface QueryState<TData> {
  /** The query result data */
  data: TData | undefined;
  /** Error if query failed */
  error: ApiError | null;
  /** Whether query is currently fetching */
  isLoading: boolean;
  /** Whether data is being refetched in background */
  isFetching: boolean;
  /** Whether query has completed successfully at least once */
  isSuccess: boolean;
  /** Whether query has failed */
  isError: boolean;
  /** Whether data is stale and should be refetched */
  isStale: boolean;
}

export interface QueryResult<TData> extends QueryState<TData> {
  /** Manually refetch the data */
  refetch: () => Promise<TData | undefined>;
}

/**
 * Hook for API queries with automatic retry and background refetching
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useApiQuery<User[]>('/api/users', {
 *   refetchInterval: 30000, // Refetch every 30 seconds
 *   onError: (error) => console.error('Failed to load users:', error),
 * });
 * ```
 */
export function useApiQuery<TData = unknown>(
  url: string | null,
  options: QueryOptions<TData> = {}
): QueryResult<TData> {
  const {
    enabled = true,
    refetchInterval = 0,
    refetchOnWindowFocus = false,
    staleTime = 0,
    onSuccess,
    onError,
    retry,
    initialData,
  } = options;

  const [state, setState] = useState<QueryState<TData>>({
    data: initialData,
    error: null,
    isLoading: enabled && !!url && !initialData,
    isFetching: false,
    isSuccess: !!initialData,
    isError: false,
    isStale: !initialData,
  });

  const lastFetchTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(
    async (isBackground = false): Promise<TData | undefined> => {
      if (!url) return undefined;

      // Check if data is still fresh
      if (!isBackground && staleTime > 0) {
        const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
        if (timeSinceLastFetch < staleTime && state.data) {
          return state.data;
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: !isBackground && !prev.data,
        isFetching: true,
        isStale: false,
      }));

      try {
        const response = await fetchWithRetry(url, { method: 'GET' }, retry);
        const data = await parseApiResponse<TData>(response);

        if (!mountedRef.current) return data;

        lastFetchTimeRef.current = Date.now();

        setState({
          data,
          error: null,
          isLoading: false,
          isFetching: false,
          isSuccess: true,
          isError: false,
          isStale: false,
        });

        onSuccess?.(data);
        return data;
      } catch (err) {
        const error = err instanceof ApiError ? err : new ApiError(String(err), 0);

        if (!mountedRef.current) throw error;

        setState((prev) => ({
          ...prev,
          error,
          isLoading: false,
          isFetching: false,
          isError: true,
          isStale: true,
        }));

        onError?.(error);
        return undefined;
      }
    },
    [url, staleTime, retry, onSuccess, onError, state.data]
  );

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && url) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [url, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch interval
  useEffect(() => {
    if (refetchInterval > 0 && enabled && url) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refetchInterval, enabled, url, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled || !url) return;

    const handleFocus = () => {
      // Only refetch if data is stale
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (staleTime === 0 || timeSinceLastFetch >= staleTime) {
        fetchData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, url, staleTime, fetchData]);

  // Mark data as stale after staleTime
  useEffect(() => {
    if (staleTime <= 0 || !state.isSuccess) return;

    const timeout = setTimeout(() => {
      setState((prev) => ({ ...prev, isStale: true }));
    }, staleTime);

    return () => clearTimeout(timeout);
  }, [staleTime, state.isSuccess, lastFetchTimeRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => fetchData(false), [fetchData]);

  return {
    ...state,
    refetch,
  };
}

/**
 * Hook for paginated API queries
 */
export interface PaginatedQueryOptions<TData> extends QueryOptions<TData> {
  /** Current page number */
  page?: number;
  /** Page size */
  pageSize?: number;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function usePaginatedQuery<TItem>(
  baseUrl: string | null,
  options: PaginatedQueryOptions<PaginatedData<TItem>> = {}
): QueryResult<PaginatedData<TItem>> & {
  page: number;
  setPage: (page: number) => void;
} {
  const { page = 1, pageSize = 20, ...queryOptions } = options;
  const [currentPage, setCurrentPage] = useState(page);

  const url = baseUrl ? `${baseUrl}?p=${currentPage}&ps=${pageSize}` : null;

  const query = useApiQuery<PaginatedData<TItem>>(url, queryOptions);

  return {
    ...query,
    page: currentPage,
    setPage: setCurrentPage,
  };
}
