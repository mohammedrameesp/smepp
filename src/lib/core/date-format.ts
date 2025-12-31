/**
 * @file date-format.ts
 * @description Date formatting utilities for consistent date display across the application.
 *              Format: 10 Aug 2025. All dates are displayed in Qatar timezone (GST, UTC+3)
 * @module lib/core
 */

import { QATAR_TIMEZONE } from './qatar-timezone';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format a date to "10 Aug 2025" format in Qatar timezone
 * @param date - Date object, string, or null
 * @returns Formatted date string or fallback text
 */
export function formatDate(date: Date | string | null | undefined, fallback: string = 'N/A'): string {
  if (!date) return fallback;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return fallback;

  // Format in Qatar timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(dateObj);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');

  return `${day} ${MONTH_NAMES[month]} ${year}`;
}

/**
 * Format a date to "10 Aug 2025 14:30" format in Qatar timezone
 * @param date - Date object, string, or null
 * @returns Formatted datetime string or fallback text
 */
export function formatDateTime(date: Date | string | null | undefined, fallback: string = 'N/A'): string {
  if (!date) return fallback;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return fallback;

  // Format in Qatar timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
  const hours = parts.find(p => p.type === 'hour')?.value || '00';
  const minutes = parts.find(p => p.type === 'minute')?.value || '00';

  return `${day} ${MONTH_NAMES[month]} ${year} ${hours}:${minutes}`;
}

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
 * Format date for CSV export (10 Aug 2025)
 * @param date - Date object, string, or null
 * @returns Formatted date string or empty string
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  return formatDate(date, '');
}
