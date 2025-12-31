/**
 * @file use-api-mutation.ts
 * @description React hook for API mutations with retry logic and toast notifications
 * @module hooks
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { fetchWithRetry, parseApiResponse, ApiError, type RetryOptions } from '@/lib/api/fetch-with-retry';

export interface MutationOptions<TData, TVariables> {
  /** API endpoint URL or function that returns URL based on variables */
  url: string | ((variables: TVariables) => string);
  /** HTTP method (default: POST) */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Success message to show in toast */
  successMessage?: string | ((data: TData, variables: TVariables) => string);
  /** Error message to show in toast (default: shows API error message) */
  errorMessage?: string | ((error: ApiError) => string);
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
  /** Callback on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  /** Callback on error */
  onError?: (error: ApiError, variables: TVariables) => void;
  /** Callback when mutation settles (success or error) */
  onSettled?: (data: TData | undefined, error: ApiError | null, variables: TVariables) => void;
  /** Retry options */
  retry?: RetryOptions;
}

export interface MutationState<TData> {
  /** The mutation result data */
  data: TData | undefined;
  /** Error if mutation failed */
  error: ApiError | null;
  /** Whether mutation is currently in progress */
  isLoading: boolean;
  /** Whether mutation has completed successfully */
  isSuccess: boolean;
  /** Whether mutation has failed */
  isError: boolean;
}

export interface MutationResult<TData, TVariables> extends MutationState<TData> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  /** Execute the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Reset the mutation state */
  reset: () => void;
}

/**
 * Hook for API mutations with automatic retry, toast notifications, and loading states
 *
 * @example
 * ```tsx
 * const { mutate, isLoading } = useApiMutation<User, CreateUserInput>({
 *   url: '/api/users',
 *   method: 'POST',
 *   successMessage: 'User created successfully',
 *   onSuccess: (user) => {
 *     router.push(`/users/${user.id}`);
 *   },
 * });
 *
 * // In form submit handler:
 * mutate({ name: 'John', email: 'john@example.com' });
 * ```
 */
export function useApiMutation<TData = unknown, TVariables = void>(
  options: MutationOptions<TData, TVariables>
): MutationResult<TData, TVariables> {
  const [state, setState] = useState<MutationState<TData>>({
    data: undefined,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  // Use ref to avoid stale closures
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reset = useCallback(() => {
    setState({
      data: undefined,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    });
  }, []);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    const opts = optionsRef.current;
    const url = typeof opts.url === 'function' ? opts.url(variables) : opts.url;
    const method = opts.method ?? 'POST';
    const showSuccessToast = opts.showSuccessToast ?? true;
    const showErrorToast = opts.showErrorToast ?? true;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      isError: false,
      isSuccess: false,
    }));

    let toastId: string | number | undefined;

    try {
      // Show loading toast for longer operations
      if (method !== 'DELETE') {
        toastId = toast.loading('Processing...');
      }

      const response = await fetchWithRetry(
        url,
        {
          method,
          headers: method !== 'DELETE' ? { 'Content-Type': 'application/json' } : undefined,
          body: variables !== undefined && method !== 'DELETE' ? JSON.stringify(variables) : undefined,
        },
        {
          ...opts.retry,
          onRetry: (attempt, error, delay) => {
            toast.loading(`Retrying... (attempt ${attempt})`, { id: toastId });
            opts.retry?.onRetry?.(attempt, error, delay);
          },
        }
      );

      const data = await parseApiResponse<TData>(response);

      setState({
        data,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      });

      // Dismiss loading toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      // Show success toast
      if (showSuccessToast && opts.successMessage) {
        const message =
          typeof opts.successMessage === 'function'
            ? opts.successMessage(data, variables)
            : opts.successMessage;
        toast.success(message);
      }

      // Call success callback
      await opts.onSuccess?.(data, variables);
      opts.onSettled?.(data, null, variables);

      return data;
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError(String(err), 0);

      setState({
        data: undefined,
        error,
        isLoading: false,
        isSuccess: false,
        isError: true,
      });

      // Dismiss loading toast
      if (toastId) {
        toast.dismiss(toastId);
      }

      // Show error toast
      if (showErrorToast) {
        const message =
          typeof opts.errorMessage === 'function'
            ? opts.errorMessage(error)
            : opts.errorMessage ?? error.message;
        toast.error(message);
      }

      // Call error callback
      opts.onError?.(error, variables);
      opts.onSettled?.(undefined, error, variables);

      throw error;
    }
  }, []);

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      try {
        return await mutateAsync(variables);
      } catch {
        return undefined;
      }
    },
    [mutateAsync]
  );

  return {
    ...state,
    mutate,
    mutateAsync,
    reset,
  };
}

/**
 * Simplified hook for delete operations
 */
export function useDeleteMutation<TData = { success: boolean }>(
  url: string | ((id: string) => string),
  options?: Omit<MutationOptions<TData, string>, 'url' | 'method'>
): MutationResult<TData, string> {
  return useApiMutation<TData, string>({
    url: typeof url === 'string' ? (id: string) => `${url}/${id}` : url,
    method: 'DELETE',
    successMessage: 'Deleted successfully',
    ...options,
  });
}
