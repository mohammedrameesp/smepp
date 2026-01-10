/**
 * Tests for Qatar Timezone Utilities
 * @see src/lib/qatar-timezone.ts
 */

import {
  QATAR_TIMEZONE,
  QATAR_UTC_OFFSET,
  getQatarNow,
  toQatarTime,
  parseQatarDate,
  dateInputToQatarDate,
  isInPastQatar,
  isInFutureQatar,
  isTodayQatar,
  getQatarStartOfDay,
  getQatarEndOfDay,
  formatQatarDate,
  getDaysUntilQatar,
} from '@/lib/core/datetime';

describe('Qatar Timezone Utilities', () => {
  // ===== Constants =====
  describe('Constants', () => {
    it('should export correct timezone', () => {
      expect(QATAR_TIMEZONE).toBe('Asia/Qatar');
    });

    it('should export correct UTC offset', () => {
      expect(QATAR_UTC_OFFSET).toBe(3);
    });
  });

  // ===== getQatarNow =====
  describe('getQatarNow', () => {
    it('should return a Date object', () => {
      const now = getQatarNow();
      expect(now).toBeInstanceOf(Date);
    });

    it('should return a valid date', () => {
      const now = getQatarNow();
      expect(isNaN(now.getTime())).toBe(false);
    });
  });

  // ===== toQatarTime =====
  describe('toQatarTime', () => {
    it('should convert a Date object to Qatar time', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const qatarTime = toQatarTime(date);
      expect(qatarTime).toBeInstanceOf(Date);
    });

    it('should convert a date string to Qatar time', () => {
      const qatarTime = toQatarTime('2025-01-15T12:00:00Z');
      expect(qatarTime).toBeInstanceOf(Date);
    });

    it('should return null for null input', () => {
      expect(toQatarTime(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(toQatarTime(undefined)).toBeNull();
    });

    it('should return null for invalid date string', () => {
      expect(toQatarTime('invalid-date')).toBeNull();
    });
  });

  // ===== parseQatarDate =====
  describe('parseQatarDate', () => {
    it('should parse valid YYYY-MM-DD date', () => {
      const result = parseQatarDate('2025-01-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw error for empty string', () => {
      expect(() => parseQatarDate('')).toThrow('Date string is required');
    });

    it('should throw error for invalid format', () => {
      // Note: parseQatarDate expects YYYY-MM-DD, other formats may parse incorrectly
      // Testing with clearly invalid input
      expect(() => parseQatarDate('not-a-date')).toThrow();
    });

    it('should throw error for incomplete date', () => {
      expect(() => parseQatarDate('2025-01')).toThrow();
    });
  });

  // ===== dateInputToQatarDate =====
  describe('dateInputToQatarDate', () => {
    it('should convert date input to Date object', () => {
      const result = dateInputToQatarDate('2025-06-15');
      expect(result).toBeInstanceOf(Date);
      if (result) {
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(5); // June (0-indexed)
        expect(result.getDate()).toBe(15);
      }
    });

    it('should return null for empty string', () => {
      expect(dateInputToQatarDate('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(dateInputToQatarDate('invalid')).toBeNull();
      // Note: JavaScript Date is lenient with invalid month/day, testing with clearly invalid input
      expect(dateInputToQatarDate('abc-def-ghi')).toBeNull();
    });

    it('should return null for incomplete date', () => {
      expect(dateInputToQatarDate('2025-01')).toBeNull();
      expect(dateInputToQatarDate('2025')).toBeNull();
    });
  });

  // ===== isInPastQatar =====
  describe('isInPastQatar', () => {
    it('should return true for past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(isInPastQatar(pastDate)).toBe(true);
    });

    it('should return true for past date string', () => {
      expect(isInPastQatar('2020-01-01')).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2099-12-31');
      expect(isInPastQatar(futureDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isInPastQatar(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isInPastQatar(undefined)).toBe(false);
    });
  });

  // ===== isInFutureQatar =====
  describe('isInFutureQatar', () => {
    it('should return true for future date', () => {
      const futureDate = new Date('2099-12-31');
      expect(isInFutureQatar(futureDate)).toBe(true);
    });

    it('should return true for future date string', () => {
      expect(isInFutureQatar('2099-12-31')).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(isInFutureQatar(pastDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isInFutureQatar(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isInFutureQatar(undefined)).toBe(false);
    });
  });

  // ===== isTodayQatar =====
  describe('isTodayQatar', () => {
    it('should return true for today', () => {
      const today = getQatarNow();
      expect(isTodayQatar(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isTodayQatar(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isTodayQatar(tomorrow)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTodayQatar(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTodayQatar(undefined)).toBe(false);
    });
  });

  // ===== getQatarStartOfDay =====
  describe('getQatarStartOfDay', () => {
    it('should return start of day', () => {
      const testDate = new Date(2025, 5, 15, 14, 30, 45);
      const startOfDay = getQatarStartOfDay(testDate);

      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);
      expect(startOfDay.getMilliseconds()).toBe(0);
    });

    it('should return start of current day when no date provided', () => {
      const startOfDay = getQatarStartOfDay();
      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
    });

    it('should preserve the date', () => {
      const testDate = new Date(2025, 5, 15, 14, 30, 45);
      const startOfDay = getQatarStartOfDay(testDate);

      expect(startOfDay.getFullYear()).toBe(2025);
      expect(startOfDay.getMonth()).toBe(5);
      expect(startOfDay.getDate()).toBe(15);
    });
  });

  // ===== getQatarEndOfDay =====
  describe('getQatarEndOfDay', () => {
    it('should return end of day', () => {
      const testDate = new Date(2025, 5, 15, 14, 30, 45);
      const endOfDay = getQatarEndOfDay(testDate);

      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
      expect(endOfDay.getMilliseconds()).toBe(999);
    });

    it('should return end of current day when no date provided', () => {
      const endOfDay = getQatarEndOfDay();
      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
    });

    it('should preserve the date', () => {
      const testDate = new Date(2025, 5, 15, 14, 30, 45);
      const endOfDay = getQatarEndOfDay(testDate);

      expect(endOfDay.getFullYear()).toBe(2025);
      expect(endOfDay.getMonth()).toBe(5);
      expect(endOfDay.getDate()).toBe(15);
    });
  });

  // ===== formatQatarDate =====
  describe('formatQatarDate', () => {
    it('should format date without time', () => {
      const date = new Date('2025-06-15T12:00:00Z');
      const formatted = formatQatarDate(date);
      // Should contain day, month, year
      expect(formatted).toMatch(/\d{1,2}/); // Day
      expect(formatted).toMatch(/[A-Za-z]{3,}/); // Month name
      expect(formatted).toMatch(/2025/); // Year
    });

    it('should format date with time', () => {
      const date = new Date('2025-06-15T12:30:00Z');
      const formatted = formatQatarDate(date, true);
      // Should contain time
      expect(formatted).toMatch(/\d{1,2}:\d{2}/); // HH:MM
    });

    it('should format date string', () => {
      const formatted = formatQatarDate('2025-06-15');
      expect(formatted).not.toBe('N/A');
    });

    it('should return N/A for null', () => {
      expect(formatQatarDate(null)).toBe('N/A');
    });

    it('should return N/A for undefined', () => {
      expect(formatQatarDate(undefined)).toBe('N/A');
    });

    it('should return N/A for invalid date', () => {
      expect(formatQatarDate('invalid-date')).toBe('N/A');
    });
  });

  // ===== getDaysUntilQatar =====
  describe('getDaysUntilQatar', () => {
    it('should return positive days for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const days = getDaysUntilQatar(futureDate);
      expect(days).toBeGreaterThanOrEqual(9); // Allow for timezone edge cases
      expect(days).toBeLessThanOrEqual(11);
    });

    it('should return negative days for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const days = getDaysUntilQatar(pastDate);
      expect(days).toBeLessThanOrEqual(-9);
      expect(days).toBeGreaterThanOrEqual(-11);
    });

    it('should return 0 for today', () => {
      const today = getQatarStartOfDay();
      const days = getDaysUntilQatar(today);
      expect(days).toBe(0);
    });

    it('should return null for null input', () => {
      expect(getDaysUntilQatar(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(getDaysUntilQatar(undefined)).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(getDaysUntilQatar('invalid-date')).toBeNull();
    });

    it('should work with date string', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      const dateString = futureDate.toISOString().split('T')[0];
      const days = getDaysUntilQatar(dateString);
      expect(days).toBeGreaterThanOrEqual(4);
      expect(days).toBeLessThanOrEqual(6);
    });
  });
});
