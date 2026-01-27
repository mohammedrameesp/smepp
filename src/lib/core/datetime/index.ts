/**
 * @file index.ts
 * @description Unified datetime module - consolidates all date/time utilities
 *              including constants, formatting, timezone operations, and parsing.
 *
 * All functions display dates in Qatar timezone (Asia/Qatar, GST, UTC+3).
 * Qatar does not observe daylight saving time.
 *
 * @module lib/core/datetime
 */

// Constants
export { QATAR_TIMEZONE, MONTH_NAMES } from './constants';

// Formatting functions
export {
  formatDate,
  formatDateTime,
  formatDateForCSV,
  formatRelativeTime,
  formatMonthYear,
  formatDayMonth,
} from './formatting';

// Timezone operations
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

// Parsing utilities
export { toInputDateString, parseInputDateString, dateInputToQatarDate } from './parsing';
