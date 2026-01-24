/**
 * @file calendar-utils.ts
 * @description Generic calendar and date utilities for working day calculations
 * @module utils
 *
 * These utilities provide common date operations for business logic
 * that needs to work with working days, weekends, and holidays.
 */

/**
 * Default weekend days (Friday and Saturday for Qatar/GCC region)
 * Day numbers: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
export const DEFAULT_WEEKEND_DAYS = [5, 6] as const;

/**
 * Western weekend days (Saturday and Sunday)
 */
export const WESTERN_WEEKEND_DAYS = [0, 6] as const;

/**
 * Holiday data structure for calendar calculations
 */
export interface HolidayData {
  /** Unique identifier */
  id: string;
  /** Holiday name */
  name: string;
  /** Start date of the holiday */
  startDate: Date;
  /** End date of the holiday (same as start for single-day holidays) */
  endDate: Date;
}

/**
 * Options for working day calculations
 */
export interface WorkingDaysOptions {
  /** Days of the week to consider as weekend (defaults to [5, 6] for Fri/Sat) */
  weekendDays?: readonly number[];
  /** List of holidays to exclude */
  holidays?: HolidayData[];
  /** If true, includes weekends in the count */
  includeWeekends?: boolean;
  /** If true, excludes holidays from the count */
  excludeHolidays?: boolean;
}

/**
 * Check if a date falls on a weekend
 *
 * @example
 * ```ts
 * // Using GCC weekend (Fri/Sat)
 * isWeekend(new Date('2024-01-05')); // true (Friday)
 *
 * // Using Western weekend (Sat/Sun)
 * isWeekend(new Date('2024-01-06'), WESTERN_WEEKEND_DAYS); // true (Saturday)
 * ```
 */
export function isWeekend(
  date: Date,
  weekendDays: readonly number[] = DEFAULT_WEEKEND_DAYS
): boolean {
  return weekendDays.includes(date.getDay());
}

/**
 * Check if a date is a holiday
 *
 * @returns The holiday name if it's a holiday, null otherwise
 */
export function isHoliday(date: Date, holidays: HolidayData[]): string | null {
  const checkDate = normalizeDate(date);

  for (const holiday of holidays) {
    const start = normalizeDate(holiday.startDate);
    const end = normalizeDate(holiday.endDate);

    if (checkDate >= start && checkDate <= end) {
      return holiday.name;
    }
  }

  return null;
}

/**
 * Check if a date is a working day (not weekend and not holiday)
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
 * Calculate the number of calendar days between two dates (inclusive)
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
 * Calculate the number of working days between two dates (inclusive)
 * Excludes weekends and optionally holidays.
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
 * Get the next working day from a given date
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
 * Get the previous working day from a given date
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
 * Add working days to a date
 *
 * @example
 * ```ts
 * // Add 5 working days
 * addWorkingDays(new Date('2024-01-01'), 5);
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
 * Get all holidays that fall within a date range
 */
export function getHolidaysInRange(
  startDate: Date,
  endDate: Date,
  holidays: HolidayData[]
): HolidayData[] {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  return holidays.filter((holiday) => {
    const holidayStart = normalizeDate(holiday.startDate);
    const holidayEnd = normalizeDate(holiday.endDate);
    return holidayStart <= end && holidayEnd >= start;
  });
}

/**
 * Normalize a date to midnight (00:00:00.000)
 * Returns a new Date object without modifying the original.
 */
export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Check if two dates are the same calendar day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);
  return d1.getTime() === d2.getTime();
}

/**
 * Get the start of a month
 */
export function getMonthStart(date: Date): Date {
  const result = normalizeDate(date);
  result.setDate(1);
  return result;
}

/**
 * Get the end of a month
 */
export function getMonthEnd(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the start of a year
 */
export function getYearStart(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
}

/**
 * Get the end of a year
 */
export function getYearEnd(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}
