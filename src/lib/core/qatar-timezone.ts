/**
 * Qatar Timezone Utilities
 * Qatar uses Gulf Standard Time (GST): UTC+3
 * No daylight saving time
 */

export const QATAR_TIMEZONE = 'Asia/Qatar';
export const QATAR_UTC_OFFSET = 3; // hours

/**
 * Get current date/time in Qatar timezone
 */
export function getQatarNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: QATAR_TIMEZONE }));
}

/**
 * Convert a date to Qatar timezone
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
    hour12: false
  });

  return new Date(qatarDateString);
}

/**
 * Convert date input (YYYY-MM-DD) to Qatar timezone Date object
 * Use this when processing form inputs to ensure dates are in Qatar time
 */
export function dateInputToQatarDate(dateString: string): Date | null {
  if (!dateString) return null;

  try {
    // Parse date as Qatar timezone
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;

    const [year, month, day] = parts.map(num => parseInt(num, 10));

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

/**
 * Check if a date is in the past (Qatar timezone)
 */
export function isInPastQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return dateObj < now;
}

/**
 * Check if a date is in the future (Qatar timezone)
 */
export function isInFutureQatar(date: Date | string | null | undefined): boolean {
  if (!date) return false;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = getQatarNow();

  return dateObj > now;
}

/**
 * Check if a date is today (Qatar timezone)
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
 * Get start of day in Qatar timezone
 */
export function getQatarStartOfDay(date?: Date): Date {
  const d = date || getQatarNow();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Get end of day in Qatar timezone
 */
export function getQatarEndOfDay(date?: Date): Date {
  const d = date || getQatarNow();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Format date for display in Qatar timezone
 */
export function formatQatarDate(date: Date | string | null | undefined, includeTime = false): string {
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

/**
 * Get days until a date from now (Qatar timezone)
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
