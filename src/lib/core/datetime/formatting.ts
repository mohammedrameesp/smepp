/**
 * @file formatting.ts
 * @description Date formatting utilities for consistent date display across the application.
 *              All dates are displayed in Qatar timezone (GST, UTC+3)
 * @module lib/core/datetime
 */

import { QATAR_TIMEZONE, MONTH_NAMES } from './constants';
import { getQatarNow } from './timezone';

/**
 * Internal helper to parse and format date parts in Qatar timezone
 * @internal
 */
function getQatarDateParts(
  date: Date | string | null | undefined,
  includeTime: boolean = false
): { day: number; month: number; year: number; hours?: string; minutes?: string } | null {
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

  const result: { day: number; month: number; year: number; hours?: string; minutes?: string } = {
    month: parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1,
    day: parseInt(parts.find((p) => p.type === 'day')?.value || '1'),
    year: parseInt(parts.find((p) => p.type === 'year')?.value || '2024'),
  };

  if (includeTime) {
    result.hours = parts.find((p) => p.type === 'hour')?.value || '00';
    result.minutes = parts.find((p) => p.type === 'minute')?.value || '00';
  }

  return result;
}

/**
 * Format a date to "10 Aug 2025" format in Qatar timezone
 * @param date - Date object, string, or null
 * @param fallback - Fallback text if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback text
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
 * Format a date to "10 Aug 2025 14:30" format in Qatar timezone
 * @param date - Date object, string, or null
 * @param fallback - Fallback text if date is invalid (default: 'N/A')
 * @returns Formatted datetime string or fallback text
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
 * Format date for CSV export (10 Aug 2025)
 * @param date - Date object, string, or null
 * @returns Formatted date string or empty string
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  return formatDate(date, '');
}

/**
 * Format a date to relative time (e.g., "2h ago", "3d ago", "2 Jan")
 * Shows relative time for recent dates, absolute date for older ones.
 * Uses Qatar timezone for consistency.
 * @param date - Date object, string, or null
 * @returns Relative time string or formatted date
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

  if (parts.year === currentYear) {
    return `${parts.day} ${MONTH_NAMES[parts.month]}`;
  }
  return `${parts.day} ${MONTH_NAMES[parts.month]} ${String(parts.year).slice(-2)}`;
}

/**
 * Format a date to "Jan 2025" format (month and year only) in Qatar timezone
 * @param date - Date object, string, or null
 * @param fallback - Fallback text if date is invalid (default: '')
 * @returns Formatted month/year string or fallback text
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
 * Format a date to "15 Jan" format (day and month only, no year) in Qatar timezone
 * @param date - Date object, string, or null
 * @param fallback - Fallback text if date is invalid (default: '')
 * @returns Formatted day/month string or fallback text
 */
export function formatDayMonth(
  date: Date | string | null | undefined,
  fallback: string = ''
): string {
  const parts = getQatarDateParts(date);
  if (!parts) return fallback;

  return `${parts.day} ${MONTH_NAMES[parts.month]}`;
}
