'use client';

/**
 * @file use-auto-save.ts
 * @description React hook for auto-saving form values with debounce
 * @module hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveOptions<T> {
  /** The value to auto-save */
  value: T;
  /** Function to save the value */
  onSave: (value: T) => Promise<void>;
  /** Debounce delay in milliseconds (default: 500) */
  delay?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
  /** How long to show "saved" status before returning to idle (default: 2000) */
  savedDuration?: number;
}

export interface UseAutoSaveResult {
  /** Current save status */
  status: AutoSaveStatus;
  /** Error message if save failed */
  error: string | null;
  /** Manually trigger a save */
  save: () => Promise<void>;
  /** Whether currently saving */
  isSaving: boolean;
  /** Whether just saved successfully */
  isSaved: boolean;
  /** Whether there's an error */
  isError: boolean;
}

/**
 * Hook for auto-saving form values with debounce
 *
 * @example
 * ```tsx
 * const [name, setName] = useState('');
 * const { status, isSaving } = useAutoSave({
 *   value: name,
 *   onSave: async (value) => {
 *     await fetch('/api/save', { method: 'POST', body: JSON.stringify({ name: value }) });
 *   },
 * });
 *
 * return (
 *   <div>
 *     <Input value={name} onChange={(e) => setName(e.target.value)} />
 *     {isSaving && <span>Saving...</span>}
 *     {status === 'saved' && <Check className="text-green-500" />}
 *   </div>
 * );
 * ```
 */
export function useAutoSave<T>({
  value,
  onSave,
  delay = 500,
  enabled = true,
  savedDuration = 2000,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Track if this is the first render (don't save on mount)
  const isFirstRender = useRef(true);
  // Track the last saved value to avoid unnecessary saves
  const lastSavedValue = useRef(value);
  // Timeout ref for debounce
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Timeout ref for resetting "saved" status
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Latest onSave callback ref
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const save = useCallback(async () => {
    // Clear any pending debounce
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setStatus('saving');
    setError(null);

    try {
      await onSaveRef.current(value);
      lastSavedValue.current = value;
      setStatus('saved');

      // Reset to idle after savedDuration
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setStatus('idle');
      }, savedDuration);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }, [value, savedDuration]);

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if disabled
    if (!enabled) {
      return;
    }

    // Skip if value hasn't changed from last save
    if (JSON.stringify(value) === JSON.stringify(lastSavedValue.current)) {
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay, enabled, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    error,
    save,
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    isError: status === 'error',
  };
}

/**
 * Component to display auto-save status inline
 */
export function AutoSaveIndicator({
  status,
  error,
  className = '',
}: {
  status: AutoSaveStatus;
  error?: string | null;
  className?: string;
}) {
  if (status === 'idle') return null;

  return (
    <span className={`text-xs ${className}`}>
      {status === 'saving' && (
        <span className="text-muted-foreground animate-pulse">Saving...</span>
      )}
      {status === 'saved' && (
        <span className="text-green-600">Saved</span>
      )}
      {status === 'error' && (
        <span className="text-red-600" title={error || undefined}>Failed to save</span>
      )}
    </span>
  );
}
