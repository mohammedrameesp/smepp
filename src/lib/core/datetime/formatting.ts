/**
 * @file formatting.ts
 * @description Date formatting utilities for consistent date display across the application.
 *              All dates are displayed in Qatar timezone (GST, UTC+3)
 * @module lib/core/datetime
 */

import { QATAR_TIMEZONE, MONTH_NAMES } from './constants';

/**
 * Format a date to "10 Aug 2025" format in Qatar timezone
 * @param date - Date object, string, or null
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback text
 */
export function formatDate(
  date: Date | string | null | undefined,
  fallback: string = 'N/A'
): string {
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
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2024');

  return `${day} ${MONTH_NAMES[month]} ${year}`;
}

/**
 * Format a date to "10 Aug 2025 14:30" format in Qatar timezone
 * @param date - Date object, string, or null
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted datetime string or fallback text
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  fallback: string = 'N/A'
): string {
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
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value || '1');
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2024');
  const hours = parts.find((p) => p.type === 'hour')?.value || '00';
  const minutes = parts.find((p) => p.type === 'minute')?.value || '00';

  return `${day} ${MONTH_NAMES[month]} ${year} ${hours}:${minutes}`;
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
 * Shows relative time for recent dates, absolute date for older ones
 * @param date - Date object, string, or null
 * @returns Relative time string or formatted date
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
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

  // Older: show short date (e.g., "2 Jan" or "2 Jan 24")
  const day = dateObj.getDate();
  const month = MONTH_NAMES[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const currentYear = now.getFullYear();

  if (year === currentYear) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${String(year).slice(-2)}`;
}

/**
 * Format date for display in Qatar timezone
 * Uses locale-based formatting with optional time
 * @param date - Date object, string, or null
 * @param includeTime - Whether to include time in the output
 * @returns Formatted date string or 'N/A'
 */
export function formatQatarDate(
  date: Date | string | null | undefined,
  includeTime = false
): string {
  if (!date) return 'N/A';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return 'N/A';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false;
  }

  return dateObj.toLocaleString('en-GB', options);
}
