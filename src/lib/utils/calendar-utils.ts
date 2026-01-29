/**
 * @file calendar-utils.ts
 * @description Generic calendar and date utilities for working day calculations.
 *              Provides common date operations for business logic that needs to
 *              work with working days, weekends, and holidays.
 * @module utils
 *
 * @example
 * ```ts
 * import {
 *   isWeekend,
 *   isWorkingDay,
 *   countWorkingDays,
 *   addWorkingDays,
 *   DEFAULT_WEEKEND_DAYS
 * } from '@/lib/utils/calendar-utils';
 *
 * // Check if today is a weekend (Qatar: Fri/Sat)
 * const isOff = isWeekend(new Date());
 *
 * // Count working days in a range
 * const days = countWorkingDays(startDate, endDate, { excludeHolidays: true, holidays });
 * ```
 */

/**
 * Default weekend days (Friday and Saturday for Qatar/GCC region)
 * Day numbers: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
export const DEFAULT_WEEKEND_DAYS = [5, 6] as const;

/**
 * Minimal holiday interface for calendar calculations.
 * Any object with startDate and endDate can be used.
 */
export interface HolidayLike {
  /** Start date of the holiday */
  startDate: Date;
  /** End date of the holiday (same as start for single-day holidays) */
  endDate: Date;
  /** Optional holiday name */
  name?: string;
}

/**
 * Options for working day calculations
 */
export interface WorkingDaysOptions {
  /** Days of the week to consider as weekend (defaults to [5, 6] for Fri/Sat) */
  weekendDays?: readonly number[] | number[];
  /** List of holidays to exclude */
  holidays?: HolidayLike[];
  /** If true, includes weekends in the count */
  includeWeekends?: boolean;
  /** If true, excludes holidays from the count */
  excludeHolidays?: boolean;
}

/**
 * Normalize a date to midnight (00:00:00.000).
 * Returns a new Date object without modifying the original.
 *
 * @param date - Date to normalize
 * @returns New Date object set to midnight
 */
export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Check if a date falls on a weekend.
 *
 * @param date - Date to check
 * @param weekendDays - Array of weekend day numbers (default: [5, 6] for Fri/Sat)
 * @returns True if the date is a weekend day
 *
 * @example
 * ```ts
 * // Using GCC weekend (Fri/Sat) - default
 * isWeekend(new Date('2024-01-05')); // true (Friday)
 *
 * // Using custom weekend days (e.g., Sat/Sun)
 * isWeekend(new Date('2024-01-06'), [0, 6]); // true (Saturday)
 * ```
 */
export function isWeekend(
  date: Date,
  weekendDays: readonly number[] | number[] = DEFAULT_WEEKEND_DAYS
): boolean {
  return weekendDays.includes(date.getDay());
}

/**
 * Check if a date is a holiday.
 *
 * @param date - Date to check
 * @param holidays - Array of holidays
 * @returns The holiday name if it's a holiday, null otherwise
 */
export function isHoliday(date: Date, holidays: HolidayLike[]): string | null {
  const checkDate = normalizeDate(date);

  for (const holiday of holidays) {
    const start = normalizeDate(holiday.startDate);
    const end = normalizeDate(holiday.endDate);

    if (checkDate >= start && checkDate <= end) {
      return holiday.name || 'Holiday';
    }
  }

  return null;
}

/**
 * Check if a date is a working day (not weekend and not holiday).
 *
 * @param date - Date to check
 * @param options - Optional weekend days and holidays configuration
 * @returns True if the date is a working day
 */
export function isWorkingDay(
  date: Date,
  options: Pick<WorkingDaysOptions, 'weekendDays' | 'holidays'> = {}
): boolean {
  const { weekendDays = DEFAULT_WEEKEND_DAYS, holidays = [] } = options;

  if (isWeekend(date, weekendDays)) {
    return false;
  }

  if (holidays.length > 0 && isHoliday(date, holidays) !== null) {
    return false;
  }

  return true;
}

/**
 * Calculate the number of calendar days between two dates (inclusive).
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of calendar days (always >= 0)
 *
 * @example
 * ```ts
 * countCalendarDays(new Date('2024-01-01'), new Date('2024-01-05')); // 5
 * ```
 */
export function countCalendarDays(startDate: Date, endDate: Date): number {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(0, diffDays);
}

/**
 * Calculate the number of working days between two dates (inclusive).
 * Excludes weekends and optionally holidays.
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param options - Configuration for weekends and holidays
 * @returns Number of working days
 *
 * @example
 * ```ts
 * // Count working days excluding Fri/Sat
 * countWorkingDays(new Date('2024-01-01'), new Date('2024-01-07'));
 *
 * // Count working days excluding holidays
 * countWorkingDays(start, end, { holidays: [...], excludeHolidays: true });
 * ```
 */
export function countWorkingDays(
  startDate: Date,
  endDate: Date,
  options: WorkingDaysOptions = {}
): number {
  const {
    weekendDays = DEFAULT_WEEKEND_DAYS,
    holidays = [],
    includeWeekends = false,
    excludeHolidays = false,
  } = options;

  // If including weekends and not excluding holidays, just count calendar days
  if (includeWeekends && !excludeHolidays) {
    return countCalendarDays(startDate, endDate);
  }

  let count = 0;
  const current = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  while (current <= end) {
    let shouldCount = true;

    // Check weekend
    if (!includeWeekends && isWeekend(current, weekendDays)) {
      shouldCount = false;
    }

    // Check holiday
    if (shouldCount && excludeHolidays && isHoliday(current, holidays) !== null) {
      shouldCount = false;
    }

    if (shouldCount) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Count the number of holiday days within a date range.
 * Optionally excludes holidays that fall on weekends.
 *
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @param holidays - Array of holidays
 * @param excludeWeekendHolidays - If true, don't count holidays on weekends
 * @param weekendDays - Weekend day numbers
 * @returns Number of holiday days in range
 */
export function countHolidayDays(
  startDate: Date,
  endDate: Date,
  holidays: HolidayLike[],
  excludeWeekendHolidays: boolean = true,
  weekendDays: readonly number[] | number[] = DEFAULT_WEEKEND_DAYS
): number {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const isHolidayDay = isHoliday(current, holidays) !== null;
    const isWeekendDay = isWeekend(current, weekendDays);

    // Count if it's a holiday and (we're including weekend holidays OR it's not a weekend)
    if (isHolidayDay && (!excludeWeekendHolidays || !isWeekendDay)) {
      count++;
    }

    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get the next working day from a given date.
 *
 * @param date - Starting date
 * @param options - Weekend days and holidays configuration
 * @returns The next working day
 */
export function getNextWorkingDay(
  date: Date,
  options: Pick<WorkingDaysOptions, 'weekendDays' | 'holidays'> = {}
): Date {
  const current = normalizeDate(date);
  current.setDate(current.getDate() + 1);

  while (!isWorkingDay(current, options)) {
    current.setDate(current.getDate() + 1);
  }

  return current;
}

/**
 * Get the previous working day from a given date.
 *
 * @param date - Starting date
 * @param options - Weekend days and holidays configuration
 * @returns The previous working day
 */
export function getPreviousWorkingDay(
  date: Date,
  options: Pick<WorkingDaysOptions, 'weekendDays' | 'holidays'> = {}
): Date {
  const current = normalizeDate(date);
  current.setDate(current.getDate() - 1);

  while (!isWorkingDay(current, options)) {
    current.setDate(current.getDate() - 1);
  }

  return current;
}

/**
 * Add working days to a date.
 *
 * @param date - Starting date
 * @param days - Number of working days to add (negative to subtract)
 * @param options - Weekend days and holidays configuration
 * @returns New date after adding working days
 *
 * @example
 * ```ts
 * // Add 5 working days
 * addWorkingDays(new Date('2024-01-01'), 5);
 *
 * // Subtract 3 working days
 * addWorkingDays(new Date('2024-01-10'), -3);
 * ```
 */
export function addWorkingDays(
  date: Date,
  days: number,
  options: Pick<WorkingDaysOptions, 'weekendDays' | 'holidays'> = {}
): Date {
  const result = normalizeDate(date);
  let remaining = Math.abs(days);
  const direction = days >= 0 ? 1 : -1;

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);
    if (isWorkingDay(result, options)) {
      remaining--;
    }
  }

  return result;
}

/**
 * Get all holidays that fall within a date range.
 *
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @param holidays - Array of all holidays
 * @returns Array of holidays that overlap with the date range
 */
export function getHolidaysInRange<T extends HolidayLike>(
  startDate: Date,
  endDate: Date,
  holidays: T[]
): T[] {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  return holidays.filter((holiday) => {
    const holidayStart = normalizeDate(holiday.startDate);
    const holidayEnd = normalizeDate(holiday.endDate);
    return holidayStart <= end && holidayEnd >= start;
  });
}

/**
 * Get holiday names within a date range.
 *
 * @param startDate - Start date of range
 * @param endDate - End date of range
 * @param holidays - Array of holidays
 * @returns Array of unique holiday names
 */
export function getHolidayNamesInRange(
  startDate: Date,
  endDate: Date,
  holidays: HolidayLike[]
): string[] {
  const holidaysInRange = getHolidaysInRange(startDate, endDate, holidays);
  const names = holidaysInRange.map((h) => h.name || 'Holiday');
  return [...new Set(names)];
}

/**
 * Check if two dates are the same calendar day.
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if both dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getTime() === d2.getTime();
}

/**
 * Check if two date ranges overlap.
 *
 * @param start1 - Start of first range
 * @param end1 - End of first range
 * @param start2 - Start of second range
 * @param end2 - End of second range
 * @returns True if ranges overlap
 */
export function datesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  const s1 = normalizeDate(start1);
  const e1 = normalizeDate(end1);
  const s2 = normalizeDate(start2);
  const e2 = normalizeDate(end2);
  return s1 <= e2 && e1 >= s2;
}

/**
 * Get the start of a month (first day at midnight).
 *
 * @param date - Any date in the month
 * @returns First day of the month
 */
export function getMonthStart(date: Date): Date {
  const result = normalizeDate(date);
  result.setDate(1);
  return result;
}

/**
 * Get the end of a month (last day at 23:59:59.999).
 *
 * @param date - Any date in the month
 * @returns Last day of the month
 */
export function getMonthEnd(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a year (January 1st at midnight).
 *
 * @param date - Any date in the year
 * @returns January 1st of that year
 */
export function getYearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

/**
 * Get the end of a year (December 31st at 23:59:59.999).
 *
 * @param date - Any date in the year
 * @returns December 31st of that year
 */
export function getYearEnd(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}
