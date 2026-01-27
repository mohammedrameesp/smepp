/**
 * @file formatting.ts
 * @description Date formatting utilities for consistent date display across the Durj platform.
 *              All dates are displayed in Qatar timezone (GST, UTC+3).
 * @module lib/core/datetime
 *
 * @example
 * ```ts
 * import { formatDate, formatDateTime, formatRelativeTime } from '@/lib/core/datetime';
 *
 * formatDate(new Date());           // "15 Jan 2025"
 * formatDateTime(new Date());       // "15 Jan 2025 14:30"
 * formatRelativeTime(new Date());   // "now", "5m ago", "2h ago", "3d ago"
 * ```
 */

import { QATAR_TIMEZONE, MONTH_NAMES } from './constants';
import { getQatarNow } from './timezone';

/** Date parts extracted in Qatar timezone */
interface QatarDateParts {
  day: number;
  month: number;
  year: number;
  hours?: string;
  minutes?: string;
}

/**
 * Internal helper to parse and format date parts in Qatar timezone.
 *
 * @internal
 * @param date - Date to parse
 * @param includeTime - Whether to include time components
 * @returns Parsed date parts or null if invalid
 */
function getQatarDateParts(
  date: Date | string | null | undefined,
  includeTime: boolean = false
): QatarDateParts | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false;
  }

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(dateObj);

  // Extract parts with safe defaults (use current year as fallback)
  const currentYear = new Date().getFullYear();

  const result: QatarDateParts = {
    month: parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10) - 1,
    day: parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10),
    year: parseInt(parts.find((p) => p.type === 'year')?.value || String(currentYear), 10),
  };

  if (includeTime) {
    result.hours = parts.find((p) => p.type === 'hour')?.value || '00';
    result.minutes = parts.find((p) => p.type === 'minute')?.value || '00';
  }

  return result;
}

/**
 * Format a date to "10 Aug 2025" format in Qatar timezone.
 *
 * @param date - Date object, ISO string, or null/undefined
 * @param fallback - Text to return if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback
 *
 * @example
 * ```ts
 * formatDate(new Date('2025-01-15'));     // "15 Jan 2025"
 * formatDate('2025-08-10T14:30:00Z');     // "10 Aug 2025"
 * formatDate(null);                        // "N/A"
 * formatDate(null, '-');                   // "-"
 * ```
 */
export function formatDate(
  date: Date | string | null | undefined,
  fallback: string = 'N/A'
): string {
  const parts = getQatarDateParts(date);
  if (!parts) return fallback;

  return `${parts.day} ${MONTH_NAMES[parts.month]} ${parts.year}`;
}

/**
 * Format a date to "10 Aug 2025 14:30" format in Qatar timezone.
 *
 * @param date - Date object, ISO string, or null/undefined
 * @param fallback - Text to return if date is invalid (default: 'N/A')
 * @returns Formatted datetime string or fallback
 *
 * @example
 * ```ts
 * formatDateTime(new Date('2025-01-15T14:30:00Z')); // "15 Jan 2025 17:30" (Qatar is UTC+3)
 * formatDateTime(null);                              // "N/A"
 * ```
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  fallback: string = 'N/A'
): string {
  const parts = getQatarDateParts(date, true);
  if (!parts) return fallback;

  return `${parts.day} ${MONTH_NAMES[parts.month]} ${parts.year} ${parts.hours}:${parts.minutes}`;
}

/**
 * Format date for CSV export using standard date format.
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Formatted date string or empty string if invalid
 *
 * @example
 * ```ts
 * formatDateForCSV(new Date('2025-01-15')); // "15 Jan 2025"
 * formatDateForCSV(null);                    // ""
 * ```
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  return formatDate(date, '');
}

/**
 * Format a date to relative time for recent dates, absolute for older.
 *
 * Shows contextual time:
 * - < 1 min: "now"
 * - < 1 hour: "Xm ago"
 * - < 24 hours: "Xh ago"
 * - < 7 days: "Xd ago"
 * - Same year: "15 Jan"
 * - Different year: "15 Jan 24"
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Relative time string, short date, or empty string if invalid
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date());                    // "now"
 * formatRelativeTime(Date.now() - 5 * 60 * 1000);   // "5m ago"
 * formatRelativeTime(Date.now() - 2 * 3600 * 1000); // "2h ago"
 * formatRelativeTime('2024-01-15');                  // "15 Jan 24"
 * ```
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const now = getQatarNow();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Just now (< 1 min)
  if (diffMins < 1) return 'now';

  // Minutes (< 1 hour)
  if (diffMins < 60) return `${diffMins}m ago`;

  // Hours (< 24 hours)
  if (diffHours < 24) return `${diffHours}h ago`;

  // Days (< 7 days)
  if (diffDays < 7) return `${diffDays}d ago`;

  // Older: show short date in Qatar timezone
  const parts = getQatarDateParts(dateObj);
  if (!parts) return '';

  const currentYear = now.getFullYear();

  // Same year: "15 Jan", different year: "15 Jan 24"
  if (parts.year === currentYear) {
    return `${parts.day} ${MONTH_NAMES[parts.month]}`;
  }
  return `${parts.day} ${MONTH_NAMES[parts.month]} ${String(parts.year).slice(-2)}`;
}

/**
 * Format a date to "Jan 2025" format (month and year only).
 *
 * @param date - Date object, ISO string, or null/undefined
 * @param fallback - Text to return if date is invalid (default: '')
 * @returns Formatted month/year string or fallback
 *
 * @example
 * ```ts
 * formatMonthYear(new Date('2025-01-15')); // "Jan 2025"
 * formatMonthYear(null);                    // ""
 * ```
 */
export function formatMonthYear(
  date: Date | string | null | undefined,
  fallback: string = ''
): string {
  const parts = getQatarDateParts(date);
  if (!parts) return fallback;

  return `${MONTH_NAMES[parts.month]} ${parts.year}`;
}

/**
 * Format a date to "15 Jan" format (day and month only, no year).
 *
 * @param date - Date object, ISO string, or null/undefined
 * @param fallback - Text to return if date is invalid (default: '')
 * @returns Formatted day/month string or fallback
 *
 * @example
 * ```ts
 * formatDayMonth(new Date('2025-01-15')); // "15 Jan"
 * formatDayMonth(null);                    // ""
 * ```
 */
export function formatDayMonth(
  date: Date | string | null | undefined,
  fallback: string = ''
): string {
  const parts = getQatarDateParts(date);
  if (!parts) return fallback;

  return `${parts.day} ${MONTH_NAMES[parts.month]}`;
}
