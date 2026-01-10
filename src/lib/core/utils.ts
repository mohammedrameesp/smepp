/**
 * @file utils.ts
 * @description General utility functions
 * @module lib/core
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind CSS classes with proper conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Build URLSearchParams from a filters object.
 * Skips null, undefined, empty strings, and 'all' values.
 *
 * @example
 * ```typescript
 * const params = buildSearchParams({
 *   p: 1,
 *   ps: 20,
 *   q: 'search term',
 *   status: 'active',
 *   category: 'all', // skipped
 *   empty: '', // skipped
 * });
 * // Results in: p=1&ps=20&q=search+term&status=active
 * ```
 */
export function buildSearchParams(
  filters: Record<string, unknown>,
  options?: {
    skipValues?: (string | null | undefined)[];
  }
): URLSearchParams {
  const params = new URLSearchParams();
  const skipValues = options?.skipValues ?? ['all', '', null, undefined];

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && !skipValues.includes(value as string)) {
      params.set(key, String(value));
    }
  });

  return params;
}

/**
 * Parse URLSearchParams into a typed object.
 *
 * @example
 * ```typescript
 * const params = parseSearchParams<{ page: number; search: string }>(
 *   searchParams,
 *   { page: 1, search: '' }
 * );
 * ```
 */
export function parseSearchParams<T extends Record<string, unknown>>(
  searchParams: URLSearchParams,
  defaults: T
): T {
  const result = { ...defaults };

  Object.keys(defaults).forEach((key) => {
    const value = searchParams.get(key);
    if (value !== null) {
      const defaultValue = defaults[key];
      if (typeof defaultValue === 'number') {
        (result as Record<string, unknown>)[key] = Number(value) || defaultValue;
      } else if (typeof defaultValue === 'boolean') {
        (result as Record<string, unknown>)[key] = value === 'true';
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  });

  return result;
}

/**
 * Append multiple values to URLSearchParams at once.
 */
export function appendSearchParams(
  params: URLSearchParams,
  values: Record<string, unknown>
): URLSearchParams {
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '' && value !== 'all') {
      params.append(key, String(value));
    }
  });
  return params;
}
