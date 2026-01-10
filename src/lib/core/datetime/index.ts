/**
 * @file index.ts
 * @description Unified datetime module - consolidates all date/time utilities
 *              including constants, formatting, timezone operations, and parsing
 * @module lib/core/datetime
 */

// Constants
export { QATAR_TIMEZONE, QATAR_UTC_OFFSET, MONTH_NAMES } from './constants';

// Formatting functions
export {
  formatDate,
  formatDateTime,
  formatDateForCSV,
  formatRelativeTime,
  formatQatarDate,
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
