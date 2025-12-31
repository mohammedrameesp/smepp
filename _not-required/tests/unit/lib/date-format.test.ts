/**
 * Tests for Date Formatting Functions
 * @see src/lib/date-format.ts
 */

import {
  formatDate,
  formatDateTime,
  toInputDateString,
  parseInputDateString,
  formatDateForCSV,
} from '@/lib/date-format';

describe('Date Formatting Functions', () => {
  describe('formatDate', () => {
    it('should format a Date object to "10 Aug 2025" format', () => {
      const date = new Date('2025-08-10T12:00:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
      expect(result).toContain('Aug');
      expect(result).toContain('2025');
    });

    it('should format a date string', () => {
      const result = formatDate('2025-01-15');
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
      expect(result).toContain('Jan');
      expect(result).toContain('2025');
    });

    it('should return fallback for null', () => {
      const result = formatDate(null);
      expect(result).toBe('N/A');
    });

    it('should return fallback for undefined', () => {
      const result = formatDate(undefined);
      expect(result).toBe('N/A');
    });

    it('should return custom fallback when provided', () => {
      const result = formatDate(null, 'Not Set');
      expect(result).toBe('Not Set');
    });

    it('should return fallback for invalid date string', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('N/A');
    });

    it('should handle ISO date strings', () => {
      const result = formatDate('2024-12-25T10:30:00.000Z');
      expect(result).toMatch(/^\d{1,2} Dec 2024$/);
    });

    it('should handle all months correctly', () => {
      const months = [
        { month: '01', name: 'Jan' },
        { month: '02', name: 'Feb' },
        { month: '03', name: 'Mar' },
        { month: '04', name: 'Apr' },
        { month: '05', name: 'May' },
        { month: '06', name: 'Jun' },
        { month: '07', name: 'Jul' },
        { month: '08', name: 'Aug' },
        { month: '09', name: 'Sep' },
        { month: '10', name: 'Oct' },
        { month: '11', name: 'Nov' },
        { month: '12', name: 'Dec' },
      ];

      months.forEach(({ month, name }) => {
        const result = formatDate(`2024-${month}-15T12:00:00Z`);
        expect(result).toContain(name);
      });
    });
  });

  describe('formatDateTime', () => {
    it('should format a Date object to "10 Aug 2025 14:30" format', () => {
      const date = new Date('2025-08-10T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}$/);
      expect(result).toContain('Aug');
      expect(result).toContain('2025');
    });

    it('should format a date string with time', () => {
      const result = formatDateTime('2025-01-15T09:45:00');
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}$/);
    });

    it('should return fallback for null', () => {
      const result = formatDateTime(null);
      expect(result).toBe('N/A');
    });

    it('should return fallback for undefined', () => {
      const result = formatDateTime(undefined);
      expect(result).toBe('N/A');
    });

    it('should return custom fallback when provided', () => {
      const result = formatDateTime(null, 'No Time');
      expect(result).toBe('No Time');
    });

    it('should return fallback for invalid date string', () => {
      const result = formatDateTime('invalid');
      expect(result).toBe('N/A');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2025-01-15T00:00:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/\d{2}:\d{2}$/);
    });
  });

  describe('toInputDateString', () => {
    it('should convert Date to yyyy-MM-dd format', () => {
      const date = new Date(2025, 7, 10); // August 10, 2025
      const result = toInputDateString(date);
      expect(result).toBe('2025-08-10');
    });

    it('should handle dates with single digit month and day', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      const result = toInputDateString(date);
      expect(result).toBe('2025-01-05');
    });

    it('should return empty string for null', () => {
      const result = toInputDateString(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = toInputDateString(undefined);
      expect(result).toBe('');
    });

    it('should return input as-is if already yyyy-MM-dd format', () => {
      const result = toInputDateString('2025-08-10');
      expect(result).toBe('2025-08-10');
    });

    it('should extract date part from ISO string', () => {
      const result = toInputDateString('2025-08-10T14:30:00.000Z');
      expect(result).toBe('2025-08-10');
    });

    it('should return empty string for invalid Date', () => {
      const result = toInputDateString(new Date('invalid'));
      expect(result).toBe('');
    });
  });

  describe('parseInputDateString', () => {
    it('should parse yyyy-MM-dd string to Date', () => {
      const result = parseInputDateString('2025-08-10');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(7); // August (0-indexed)
      expect(result?.getDate()).toBe(10);
    });

    it('should return null for null input', () => {
      const result = parseInputDateString(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = parseInputDateString(undefined);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseInputDateString('');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const invalidFormats = [
        '2025/08/10',
        '08-10-2025',
        '10 Aug 2025',
        '2025-8-10',
        '2025-08-1',
        'invalid',
      ];

      invalidFormats.forEach(format => {
        const result = parseInputDateString(format);
        expect(result).toBeNull();
      });
    });

    it('should handle leap year dates', () => {
      const leapYearResult = parseInputDateString('2024-02-29');
      expect(leapYearResult).not.toBeNull();
      expect(leapYearResult?.getDate()).toBe(29);

      const nonLeapYearResult = parseInputDateString('2025-02-29');
      // This will parse but create March 1, 2025 in JS
      // The function doesn't validate if the date is actually valid
      expect(nonLeapYearResult).not.toBeNull();
    });

    it('should create date at noon to avoid timezone issues', () => {
      const result = parseInputDateString('2025-08-10');
      expect(result?.getHours()).toBe(12);
      expect(result?.getMinutes()).toBe(0);
    });
  });

  describe('formatDateForCSV', () => {
    it('should format date for CSV export', () => {
      const date = new Date('2025-08-10T12:00:00Z');
      const result = formatDateForCSV(date);
      expect(result).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    });

    it('should return empty string for null (not N/A)', () => {
      const result = formatDateForCSV(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = formatDateForCSV(undefined);
      expect(result).toBe('');
    });

    it('should return empty string for invalid date', () => {
      const result = formatDateForCSV('invalid');
      expect(result).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundaries correctly', () => {
      // Use non-UTC dates to avoid timezone conversion issues
      const newYearsEve = formatDate('2024-12-31');
      expect(newYearsEve).toContain('Dec');
      expect(newYearsEve).toContain('2024');

      const newYearsDay = formatDate('2025-01-01');
      expect(newYearsDay).toContain('Jan');
      expect(newYearsDay).toContain('2025');
    });

    it('should handle very old dates', () => {
      const oldDate = formatDate('1990-05-15');
      expect(oldDate).toContain('1990');
    });

    it('should handle future dates', () => {
      const futureDate = formatDate('2099-12-31');
      expect(futureDate).toContain('2099');
    });

    it('should maintain consistency between format and parse', () => {
      const originalDateString = '2025-08-15';
      const parsed = parseInputDateString(originalDateString);
      const formatted = toInputDateString(parsed);
      expect(formatted).toBe(originalDateString);
    });
  });
});
