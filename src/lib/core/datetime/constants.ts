/**
 * @file constants.ts
 * @description Shared constants for date/time operations
 * @module lib/core/datetime
 */

/**
 * Qatar timezone identifier - Gulf Standard Time (GST)
 * UTC+3, no daylight saving time
 */
export const QATAR_TIMEZONE = 'Asia/Qatar';

/**
 * Qatar UTC offset in hours
 */
export const QATAR_UTC_OFFSET = 3;

/**
 * Short month names for date formatting
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
