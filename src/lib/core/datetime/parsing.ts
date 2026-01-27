/**
 * @file parsing.ts
 * @description Date parsing utilities for handling HTML date inputs and string conversions.
 *
 * ## Timezone Strategy
 * These utilities are designed for parsing date-only strings (YYYY-MM-DD) from HTML inputs.
 * They preserve the local date components without timezone conversions, which is the expected
 * behavior when users enter dates in form fields.
 *
 * For timezone-aware operations, use functions from ./timezone.ts instead.
 *
 * @module lib/core/datetime
 */

/**
 * Convert a Date to yyyy-MM-dd format for HTML date inputs.
 * Extracts local date components without timezone conversion.
 * @param date - Date object, string, or null
 * @returns ISO date string (yyyy-MM-dd) or empty string
 */
export function toInputDateString(date: Date | string | null | undefined): string {
  if (!date) return '';

  // If it's already yyyy-mm-dd, return as-is
  if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return date;
  }

  // If it's ISO string, extract date part before 'T'
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

  // For Date objects
  if (isNaN(date.getTime())) return '';

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * Parse a yyyy-mm-dd string to a Date object.
 * Uses local time construction (noon) to avoid timezone shifts.
 * @param dateString - Date string in yyyy-mm-dd format
 * @returns Date object or null if invalid
 */
export function parseInputDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Convert date input (YYYY-MM-DD) to a Date object at midnight local time.
 * Use this when processing form inputs where the date represents a calendar day.
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object at 00:00:00.000 or null if invalid
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
