/**
 * @file timezone.ts
 * @description Qatar timezone utilities - Gulf Standard Time (GST): UTC+3, no daylight saving
 * @module lib/core/datetime
 */

import { QATAR_TIMEZONE } from './constants';

/**
 * Get current date/time in Qatar timezone
 * @returns Date object representing the current time in Qatar
 */
export function getQatarNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: QATAR_TIMEZONE }));
}

/**
 * Convert a date to Qatar timezone
 * @param date - Date object, string, or null
 * @returns Date object in Qatar timezone or null
 */
export function toQatarTime(date: Date | string | null | undefined): Date | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  // Convert to Qatar timezone
  const qatarDateString = dateObj.toLocaleString('en-US', { timeZone: QATAR_TIMEZONE });
  return new Date(qatarDateString);
}

/**
 * Parse a date string as Qatar timezone date
 * When user enters "2025-01-01", treat it as January 1st in Qatar time, not UTC
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object
 * @throws Error if date string is empty or invalid
 */
export function parseQatarDate(dateString: string): Date {
  if (!dateString) throw new Error('Date string is required');

  // Parse the date components
  const [year, month, day] = dateString.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Create date in Qatar timezone by using toLocaleString
  // This ensures the date is treated as Qatar time, not UTC
  const qatarDate = new Date(dateString + 'T00:00:00');
  const qatarDateString = qatarDate.toLocaleString('en-US', {
    timeZone: QATAR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return new Date(qatarDateString);
}

/**
 * Check if a date is in the past (Qatar timezone)
 * @param date - Date object, string, or null
 * @returns true if date is in the past
 */
export function isInPastQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return dateObj < now;
}

/**
 * Check if a date is in the future (Qatar timezone)
 * @param date - Date object, string, or null
 * @returns true if date is in the future
 */
export function isInFutureQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return dateObj > now;
}

/**
 * Check if a date is today (Qatar timezone)
 * @param date - Date object, string, or null
 * @returns true if date is today in Qatar timezone
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
 * Get start of day in Qatar timezone (00:00:00.000)
 * @param date - Optional date, defaults to current Qatar time
 * @returns Date object representing start of day
 */
export function getQatarStartOfDay(date?: Date): Date {
  const d = date || getQatarNow();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Get end of day in Qatar timezone (23:59:59.999)
 * @param date - Optional date, defaults to current Qatar time
 * @returns Date object representing end of day
 */
export function getQatarEndOfDay(date?: Date): Date {
  const d = date || getQatarNow();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Get days until a date from now (Qatar timezone)
 * @param date - Date object, string, or null
 * @returns Number of days until date, or null if invalid
 */
export function getDaysUntilQatar(date: Date | string | null | undefined): number | null {
  if (!date) return null;

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return null;

  const now = getQatarStartOfDay();
  const target = getQatarStartOfDay(dateObj);

  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
