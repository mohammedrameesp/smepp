/**
 * @file constants.ts
 * @description Shared constants for date/time operations across the Durj platform.
 * @module lib/core/datetime
 *
 * @example
 * ```ts
 * import { QATAR_TIMEZONE, MONTH_NAMES } from '@/lib/core/datetime';
 *
 * const formatter = new Intl.DateTimeFormat('en-US', { timeZone: QATAR_TIMEZONE });
 * const monthName = MONTH_NAMES[new Date().getMonth()]; // "Jan", "Feb", etc.
 * ```
 */

/**
 * Qatar timezone identifier - Gulf Standard Time (GST)
 *
 * @remarks
 * - Fixed offset: UTC+3
 * - No daylight saving time observed in Qatar
 * - Used for all date displays in the Durj platform
 */
export const QATAR_TIMEZONE = 'Asia/Qatar';

/**
 * Short month names for date formatting (English)
 *
 * @remarks
 * Zero-indexed array matching JavaScript's Date.getMonth() return values
 */
export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Type for month name values */
export type MonthName = (typeof MONTH_NAMES)[number];
