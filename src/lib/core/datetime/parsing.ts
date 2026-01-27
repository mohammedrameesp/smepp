/**
 * @file parsing.ts
 * @description Date parsing utilities for handling HTML date inputs and string conversions.
 * @module lib/core/datetime
 *
 * ## Timezone Strategy
 *
 * These utilities are designed for parsing date-only strings (YYYY-MM-DD) from HTML inputs.
 * They preserve the local date components without timezone conversions, which is the expected
 * behavior when users enter dates in form fields.
 *
 * For timezone-aware operations, use functions from `./timezone.ts` instead.
 *
 * @example
 * ```ts
 * import { toInputDateString, parseInputDateString, dateInputToQatarDate } from '@/lib/core/datetime';
 *
 * // Convert Date to input string
 * const inputValue = toInputDateString(new Date()); // "2025-01-15"
 *
 * // Parse input string to Date
 * const date = parseInputDateString('2025-01-15'); // Date object
 *
 * // Parse for form submission (midnight)
 * const formDate = dateInputToQatarDate('2025-01-15'); // Date at 00:00:00
 * ```
 */

/**
 * Convert a Date to YYYY-MM-DD format for HTML date inputs.
 *
 * Extracts local date components without timezone conversion, preserving
 * the calendar date as the user sees it.
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Date string in YYYY-MM-DD format, or empty string if invalid
 *
 * @example
 * ```ts
 * toInputDateString(new Date('2025-01-15'));        // "2025-01-15"
 * toInputDateString('2025-01-15');                   // "2025-01-15" (passthrough)
 * toInputDateString('2025-01-15T14:30:00Z');        // "2025-01-15"
 * toInputDateString(null);                           // ""
 * ```
 */
export function toInputDateString(date: Date | string | null | undefined): string {
  if (!date) return '';

  // Already in YYYY-MM-DD format - return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // ISO string with time component - extract date part
  if (typeof date === 'string') {
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    // Try to parse other string formats (noon to avoid timezone edge cases)
    const parsed = new Date(date + 'T12:00:00');
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  }

  // Date object - extract components
  if (isNaN(date.getTime())) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object.
 *
 * Uses local time construction at noon to avoid timezone boundary issues
 * that could shift the date to an adjacent day.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at noon, or null if invalid
 *
 * @example
 * ```ts
 * parseInputDateString('2025-01-15');   // Date: Jan 15, 2025 12:00:00
 * parseInputDateString('invalid');       // null
 * parseInputDateString(null);            // null
 * parseInputDateString('2025-1-5');      // null (must be zero-padded)
 * ```
 */
export function parseInputDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;

  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Convert date input (YYYY-MM-DD) to a Date object at midnight local time.
 *
 * Use this when processing form inputs where the date represents a calendar day
 * and you need midnight as the time component (e.g., for start dates, expiry dates).
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at 00:00:00.000, or null if invalid
 *
 * @example
 * ```ts
 * dateInputToQatarDate('2025-01-15');   // Date: Jan 15, 2025 00:00:00.000
 * dateInputToQatarDate('');              // null
 * dateInputToQatarDate('invalid');       // null
 * ```
 */
export function dateInputToQatarDate(dateString: string): Date | null {
  if (!dateString) return null;

  const parts = dateString.split('-');
  if (parts.length !== 3) return null;

  const [year, month, day] = parts.map((num) => parseInt(num, 10));

  // Validate parsed numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  return isNaN(date.getTime()) ? null : date;
}
