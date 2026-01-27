/**
 * @file index.ts
 * @description Unified datetime module for the Durj platform.
 * @module lib/core/datetime
 *
 * Consolidates all date/time utilities including constants, formatting,
 * timezone operations, and parsing.
 *
 * ## Qatar Timezone
 *
 * All functions display dates in Qatar timezone (Asia/Qatar, GST, UTC+3).
 * Qatar does not observe daylight saving time, ensuring consistent behavior year-round.
 *
 * ## Quick Reference
 *
 * | Function | Output Example | Use Case |
 * |----------|----------------|----------|
 * | `formatDate()` | "15 Jan 2025" | Display dates |
 * | `formatDateTime()` | "15 Jan 2025 14:30" | Display with time |
 * | `formatRelativeTime()` | "2h ago" | Activity feeds |
 * | `formatMonthYear()` | "Jan 2025" | Payroll periods |
 * | `formatDayMonth()` | "15 Jan" | Calendars |
 * | `toInputDateString()` | "2025-01-15" | Form inputs |
 * | `getQatarStartOfDay()` | Date at 00:00 | Date comparisons |
 *
 * @example
 * ```ts
 * import {
 *   formatDate,
 *   formatDateTime,
 *   getQatarStartOfDay,
 *   toInputDateString,
 *   QATAR_TIMEZONE
 * } from '@/lib/core/datetime';
 *
 * // Display formatting
 * const displayDate = formatDate(employee.dateOfJoining);     // "15 Jan 2025"
 * const displayTime = formatDateTime(notification.createdAt); // "15 Jan 2025 14:30"
 *
 * // Form handling
 * const inputValue = toInputDateString(asset.purchaseDate);   // "2025-01-15"
 *
 * // Date comparisons
 * const today = getQatarStartOfDay();
 * const isExpired = expiryDate < today;
 * ```
 */

// =============================================================================
// Constants
// =============================================================================

export { QATAR_TIMEZONE, MONTH_NAMES } from './constants';
export type { MonthName } from './constants';

// =============================================================================
// Formatting Functions
// =============================================================================

export {
  formatDate,
  formatDateTime,
  formatDateForCSV,
  formatRelativeTime,
  formatMonthYear,
  formatDayMonth,
} from './formatting';

// =============================================================================
// Timezone Operations
// =============================================================================

export {
  getQatarNow,
  toQatarTime,
  parseQatarDate,
  isInPastQatar,
  isInFutureQatar,
  isTodayQatar,
  getQatarStartOfDay,
  getQatarEndOfDay,
  getDaysUntilQatar,
} from './timezone';

// =============================================================================
// Parsing Utilities
// =============================================================================

export { toInputDateString, parseInputDateString, dateInputToQatarDate } from './parsing';
