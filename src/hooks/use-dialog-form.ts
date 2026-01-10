/**
 * @file use-dialog-form.ts
 * @description Hook for dialog form submission with loading states and error handling
 * @module hooks
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UseDialogFormOptions<TResponse = unknown> {
  /** API endpoint */
  endpoint: string;
  /** HTTP method */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Success callback with response data */
  onSuccess?: (data: TResponse) => void;
  /** Success toast message */
  successMessage?: string;
  /** Error callback */
  onError?: (error: string) => void;
  /** Whether to refresh the page on success */
  refreshOnSuccess?: boolean;
}

/**
 * Hook for dialog form submission with loading states and error handling.
 *
 * @example
 * const { submit, isSubmitting, error } = useDialogForm({
 *   endpoint: '/api/assets',
 *   method: 'POST',
 *   successMessage: 'Asset created successfully',
 *   refreshOnSuccess: true,
 * });
 *
 * <Button onClick={() => submit(formData)} disabled={isSubmitting}>
 *   {isSubmitting ? 'Saving...' : 'Save'}
 * </Button>
 */
export function useDialogForm<TData = unknown, TResponse = unknown>(
  options: UseDialogFormOptions<TResponse>
) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (data: TData): Promise<TResponse | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(options.endpoint, {
        method: options.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || errorData.message || 'An error occurred';
        throw new Error(message);
      }

      const responseData = await response.json() as TResponse;

      if (options.successMessage) {
        toast.success(options.successMessage);
      }

      if (options.onSuccess) {
        options.onSuccess(responseData);
      }

      if (options.refreshOnSuccess) {
        router.refresh();
      }

      return responseData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);

      if (options.onError) {
        options.onError(message);
      }

      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [options, router]);

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { submit, isSubmitting, error, reset };
}
