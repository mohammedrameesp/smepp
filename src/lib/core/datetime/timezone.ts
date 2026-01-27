/**
 * @file timezone.ts
 * @description Qatar timezone utilities for the Durj platform.
 *
 * Qatar uses Gulf Standard Time (GST): UTC+3 with no daylight saving time.
 * This module provides timezone-aware date operations for consistent behavior
 * across the application.
 *
 * @module lib/core/datetime
 *
 * @example
 * ```ts
 * import {
 *   getQatarNow,
 *   getQatarStartOfDay,
 *   isInPastQatar,
 *   getDaysUntilQatar
 * } from '@/lib/core/datetime';
 *
 * const now = getQatarNow();
 * const today = getQatarStartOfDay();
 * const isExpired = isInPastQatar(document.expiryDate);
 * const daysLeft = getDaysUntilQatar(subscription.renewalDate);
 * ```
 */

import { QATAR_TIMEZONE } from './constants';

/**
 * Get current date/time in Qatar timezone.
 *
 * @returns Date object representing the current time in Qatar
 *
 * @remarks
 * This function is called frequently; results are not cached as time is always changing.
 *
 * @example
 * ```ts
 * const qatarNow = getQatarNow();
 * console.log(qatarNow.toISOString()); // Current Qatar time
 * ```
 */
export function getQatarNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: QATAR_TIMEZONE }));
}

/**
 * Convert a date to Qatar timezone.
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns Date object in Qatar timezone, or null if invalid
 *
 * @example
 * ```ts
 * const utcDate = new Date('2025-01-15T12:00:00Z');
 * const qatarDate = toQatarTime(utcDate); // 15:00 in Qatar (UTC+3)
 * ```
 */
export function toQatarTime(date: Date | string | null | undefined): Date | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;

  const qatarDateString = dateObj.toLocaleString('en-US', { timeZone: QATAR_TIMEZONE });
  return new Date(qatarDateString);
}

/**
 * Parse a date string as Qatar timezone date at midnight.
 *
 * When a user enters "2025-01-15", this treats it as January 15th in Qatar time,
 * not as a UTC date that might shift to a different day.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight on that date in local time
 * @throws {Error} If date string is empty or invalid format
 *
 * @example
 * ```ts
 * const date = parseQatarDate('2025-01-15');
 * // Returns Date for Jan 15, 2025 at 00:00:00 local time
 * ```
 */
export function parseQatarDate(dateString: string): Date {
  if (!dateString) {
    throw new Error('Date string is required');
  }

  const [year, month, day] = dateString.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Create date at midnight local time for the given date components
  // This preserves the calendar date the user intended
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Check if a date is in the past (Qatar timezone).
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns true if date is before current Qatar time, false otherwise
 *
 * @example
 * ```ts
 * isInPastQatar('2020-01-01'); // true
 * isInPastQatar('2099-12-31'); // false
 * isInPastQatar(null);          // false
 * ```
 */
export function isInPastQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return dateObj < now;
}

/**
 * Check if a date is in the future (Qatar timezone).
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns true if date is after current Qatar time, false otherwise
 *
 * @example
 * ```ts
 * isInFutureQatar('2099-12-31'); // true
 * isInFutureQatar('2020-01-01'); // false
 * isInFutureQatar(null);          // false
 * ```
 */
export function isInFutureQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return dateObj > now;
}

/**
 * Check if a date is today (Qatar timezone).
 *
 * @param date - Date object, ISO string, or null/undefined
 * @returns true if date is the same calendar day as today in Qatar
 *
 * @example
 * ```ts
 * isTodayQatar(new Date());      // true
 * isTodayQatar('2020-01-01');    // false (unless it's Jan 1, 2020)
 * isTodayQatar(null);             // false
 * ```
 */
export function isTodayQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return (
    dateObj.getFullYear() === now.getFullYear() &&
    dateObj.getMonth() === now.getMonth() &&
    dateObj.getDate() === now.getDate()
  );
}

/**
 * Get start of day in Qatar timezone (00:00:00.000).
 *
 * @param date - Optional date to get start of day for; defaults to current Qatar time
 * @returns Date object representing midnight (start) of the specified day
 *
 * @example
 * ```ts
 * const todayStart = getQatarStartOfDay();
 * const specificDayStart = getQatarStartOfDay(someDate);
 * ```
 */
export function getQatarStartOfDay(date?: Date): Date {
  const d = date || getQatarNow();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Get end of day in Qatar timezone (23:59:59.999).
 *
 * @param date - Optional date to get end of day for; defaults to current Qatar time
 * @returns Date object representing the last millisecond of the specified day
 *
 * @example
 * ```ts
 * const todayEnd = getQatarEndOfDay();
 * const specificDayEnd = getQatarEndOfDay(someDate);
 * ```
 */
export function getQatarEndOfDay(date?: Date): Date {
  const d = date || getQatarNow();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Get number of days until a target date from today (Qatar timezone).
 *
 * @param date - Target date object, ISO string, or null/undefined
 * @returns Number of days until date (negative if in past), or null if invalid
 *
 * @remarks
 * Uses start-of-day comparison for consistent day counting regardless of time.
 *
 * @example
 * ```ts
 * getDaysUntilQatar('2025-12-31'); // Days until Dec 31, 2025
 * getDaysUntilQatar('2020-01-01'); // Negative number (past date)
 * getDaysUntilQatar(null);          // null
 * ```
 */
export function getDaysUntilQatar(date: Date | string | null | undefined): number | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;

  const now = getQatarStartOfDay();
  const target = getQatarStartOfDay(dateObj);

  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
