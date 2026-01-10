/**
 * @file parsing.ts
 * @description Date parsing utilities for handling HTML date inputs and string conversions
 * @module lib/core/datetime
 */

/**
 * Convert a Date to yyyy-MM-dd format for HTML date inputs
 * Simple extraction without timezone conversions
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
    // Try to parse other string formats
    const parsed = new Date(date + 'T12:00:00'); // Parse at noon to avoid timezone issues
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
 * Parse a yyyy-mm-dd string to a Date object
 * Uses local time construction to avoid timezone shifts
 * @param dateString - Date string in yyyy-mm-dd format
 * @returns Date object or null
 */
export function parseInputDateString(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

  // Parse using local time construction to avoid timezone conversions
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Convert date input (YYYY-MM-DD) to Qatar timezone Date object
 * Use this when processing form inputs to ensure dates are in Qatar time
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object or null if invalid
 */
export function dateInputToQatarDate(dateString: string): Date | null {
  if (!dateString) return null;

  try {
    // Parse date as Qatar timezone
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;

    const [year, month, day] = parts.map((num) => parseInt(num, 10));

    // Create a date string in Qatar timezone format
    // Month is 0-indexed in Date constructor
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Verify it's valid
    if (isNaN(date.getTime())) return null;

    return date;
  } catch (error) {
    console.error('Error parsing Qatar date:', error);
    return null;
  }
}
