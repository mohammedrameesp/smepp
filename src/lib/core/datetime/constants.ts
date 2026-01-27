/**
 * @file constants.ts
 * @description Shared constants for date/time operations
 * @module lib/core/datetime
 */

/**
 * Qatar timezone identifier - Gulf Standard Time (GST)
 * UTC+3, no daylight saving time observed
 */
export const QATAR_TIMEZONE = 'Asia/Qatar';

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
