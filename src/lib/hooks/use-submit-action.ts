'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { LeaveApiError } from '@/lib/api/leave';

interface UseSubmitActionOptions<T, R> {
  /** The async action to perform */
  action: (data: T) => Promise<R>;
  /** Success message to show in toast */
  successMessage?: string;
  /** Error message prefix (actual error will be appended) */
  errorMessagePrefix?: string;
  /** Callback on success */
  onSuccess?: (result: R) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Whether to show toast notifications */
  showToast?: boolean;
}

interface UseSubmitActionResult<T, R> {
  /** Whether the action is currently running */
  isSubmitting: boolean;
  /** Error message if action failed */
  error: string | null;
  /** The result of the last successful action */
  result: R | null;
  /** Execute the action */
  execute: (data: T) => Promise<R | null>;
  /** Reset the error state */
  resetError: () => void;
  /** Reset all state */
  reset: () => void;
}

/**
 * Hook for handling form submissions and async actions
 * Manages loading, error, and success states with optional toast notifications
 */
export function useSubmitAction<T = void, R = unknown>({
  action,
  successMessage,
  errorMessagePrefix = 'Error',
  onSuccess,
  onError,
  showToast = true,
}: UseSubmitActionOptions<T, R>): UseSubmitActionResult<T, R> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<R | null>(null);

  const execute = useCallback(async (data: T): Promise<R | null> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await action(data);
      setResult(res);

      if (showToast && successMessage) {
        toast.success(successMessage);
      }

      onSuccess?.(res);
      return res;
    } catch (err) {
      const errorMessage = err instanceof LeaveApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'An unexpected error occurred';

      setError(errorMessage);

      if (showToast) {
        toast.error(`${errorMessagePrefix}: ${errorMessage}`);
      }

      onError?.(err instanceof Error ? err : new Error(errorMessage));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [action, successMessage, errorMessagePrefix, onSuccess, onError, showToast]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsSubmitting(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    isSubmitting,
    error,
    result,
    execute,
    resetError,
    reset,
  };
}

/**
 * Simplified version for dialog actions that just need loading state
 */
export function useDialogAction<T = void>(
  action: (data: T) => Promise<unknown>,
  options: {
    successMessage?: string;
    onSuccess?: () => void;
  } = {}
) {
  const [open, setOpen] = useState(false);
  const { isSubmitting, error, execute, resetError } = useSubmitAction({
    action,
    successMessage: options.successMessage,
    onSuccess: () => {
      setOpen(false);
      options.onSuccess?.();
    },
  });

  return {
    open,
    setOpen,
    isSubmitting,
    error,
    execute,
    resetError,
    closeDialog: () => {
      setOpen(false);
      resetError();
    },
  };
}
