/**
 * @file date-format.test.ts
 * @description Tests for date formatting utilities
 */

describe('Date Format Tests', () => {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  describe('formatDate', () => {
    const formatDate = (date: Date | string | null | undefined, fallback: string = 'N/A'): string => {
      if (!date) return fallback;

      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return fallback;

      const day = dateObj.getDate();
      const month = MONTH_NAMES[dateObj.getMonth()];
      const year = dateObj.getFullYear();

      return `${day} ${month} ${year}`;
    };

    it('should format Date object to "D Mon YYYY" format', () => {
      const date = new Date(2025, 7, 10); // Aug 10, 2025
      expect(formatDate(date)).toBe('10 Aug 2025');
    });

    it('should format string date to "D Mon YYYY" format', () => {
      const result = formatDate('2025-08-10T00:00:00.000Z');
      expect(result).toMatch(/\d+ Aug 2025/);
    });

    it('should return fallback for null date', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should return fallback for undefined date', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return fallback for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('N/A');
    });

    it('should use custom fallback text', () => {
      expect(formatDate(null, 'No date')).toBe('No date');
    });

    it('should format dates in different months correctly', () => {
      expect(formatDate(new Date(2025, 0, 15))).toBe('15 Jan 2025');
      expect(formatDate(new Date(2025, 5, 20))).toBe('20 Jun 2025');
      expect(formatDate(new Date(2025, 11, 25))).toBe('25 Dec 2025');
    });
  });

  describe('formatDateTime', () => {
    const formatDateTime = (date: Date | string | null | undefined, fallback: string = 'N/A'): string => {
      if (!date) return fallback;

      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return fallback;

      const day = dateObj.getDate();
      const month = MONTH_NAMES[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');

      return `${day} ${month} ${year} ${hours}:${minutes}`;
    };

    it('should format Date with time to "D Mon YYYY HH:MM" format', () => {
      const date = new Date(2025, 7, 10, 14, 30);
      expect(formatDateTime(date)).toBe('10 Aug 2025 14:30');
    });

    it('should format midnight time correctly', () => {
      const date = new Date(2025, 0, 1, 0, 0);
      expect(formatDateTime(date)).toBe('1 Jan 2025 00:00');
    });

    it('should return fallback for null', () => {
      expect(formatDateTime(null)).toBe('N/A');
    });

    it('should return fallback for invalid date string', () => {
      expect(formatDateTime('not-a-date')).toBe('N/A');
    });
  });

  describe('toInputDateString', () => {
    const toInputDateString = (date: Date | string | null | undefined): string => {
      if (!date) return '';

      // If it's already yyyy-mm-dd, return as-is
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date;
      }

      // If it's ISO string, extract date part before 'T'
      if (typeof date === 'string') {
        if (date.includes('T')) {
          return date.split('T')[0];
        }
        // Try to parse other string formats
        const parsed = new Date(date + 'T12:00:00');
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
        return '';
      }

      // For Date objects
      if (isNaN(date.getTime())) return '';

      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');

      return `${y}-${m}-${d}`;
    };

    it('should convert Date to yyyy-mm-dd format', () => {
      const date = new Date(2025, 7, 10);
      expect(toInputDateString(date)).toBe('2025-08-10');
    });

    it('should return yyyy-mm-dd string as-is', () => {
      expect(toInputDateString('2025-08-10')).toBe('2025-08-10');
    });

    it('should extract date from ISO string', () => {
      expect(toInputDateString('2025-08-10T14:30:00.000Z')).toBe('2025-08-10');
    });

    it('should return empty string for null', () => {
      expect(toInputDateString(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(toInputDateString(undefined)).toBe('');
    });

    it('should handle invalid Date object', () => {
      const invalidDate = new Date('invalid');
      expect(toInputDateString(invalidDate)).toBe('');
    });

    it('should pad single digit month and day', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(toInputDateString(date)).toBe('2025-01-05');
    });
  });

  describe('parseInputDateString', () => {
    const parseInputDateString = (dateString: string | null | undefined): Date | null => {
      if (!dateString) return null;
      if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return null;

      const [y, m, d] = dateString.split('-').map(Number);
      const date = new Date(y, m - 1, d, 12, 0, 0);

      return isNaN(date.getTime()) ? null : date;
    };

    it('should parse yyyy-mm-dd string to Date', () => {
      const result = parseInputDateString('2025-08-10');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(7); // August (0-indexed)
      expect(result?.getDate()).toBe(10);
    });

    it('should return null for null input', () => {
      expect(parseInputDateString(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(parseInputDateString(undefined)).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(parseInputDateString('10/08/2025')).toBeNull();
      expect(parseInputDateString('Aug 10, 2025')).toBeNull();
      expect(parseInputDateString('2025-8-10')).toBeNull(); // not padded
    });

    it('should parse at noon to avoid timezone issues', () => {
      const result = parseInputDateString('2025-08-10');
      expect(result?.getHours()).toBe(12);
    });
  });

  describe('formatDateForCSV', () => {
    const formatDateForCSV = (date: Date | string | null | undefined): string => {
      if (!date) return '';

      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';

      const day = dateObj.getDate();
      const month = MONTH_NAMES[dateObj.getMonth()];
      const year = dateObj.getFullYear();

      return `${day} ${month} ${year}`;
    };

    it('should format date for CSV export', () => {
      const date = new Date(2025, 7, 10);
      expect(formatDateForCSV(date)).toBe('10 Aug 2025');
    });

    it('should return empty string for null', () => {
      expect(formatDateForCSV(null)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    const formatRelativeTime = (
      date: Date | string | null | undefined,
      currentTime: Date = new Date()
    ): string => {
      if (!date) return '';

      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return '';

      const diffMs = currentTime.getTime() - dateObj.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Just now (< 1 min)
      if (diffMins < 1) return 'now';

      // Minutes (< 1 hour)
      if (diffMins < 60) return `${diffMins}m ago`;

      // Hours (< 24 hours)
      if (diffHours < 24) return `${diffHours}h ago`;

      // Days (< 7 days)
      if (diffDays < 7) return `${diffDays}d ago`;

      // Older: show short date
      const day = dateObj.getDate();
      const month = MONTH_NAMES[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      const currentYear = currentTime.getFullYear();

      if (year === currentYear) {
        return `${day} ${month}`;
      }
      return `${day} ${month} ${String(year).slice(-2)}`;
    };

    it('should return "now" for time less than 1 minute ago', () => {
      const now = new Date();
      const thirtySecsAgo = new Date(now.getTime() - 30 * 1000);
      expect(formatRelativeTime(thirtySecsAgo, now)).toBe('now');
    });

    it('should return minutes for time less than 1 hour ago', () => {
      const now = new Date();
      const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinsAgo, now)).toBe('5m ago');
    });

    it('should return hours for time less than 24 hours ago', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeHoursAgo, now)).toBe('3h ago');
    });

    it('should return days for time less than 7 days ago', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoDaysAgo, now)).toBe('2d ago');
    });

    it('should return short date for same year (older than 7 days)', () => {
      const now = new Date(2025, 7, 20); // Aug 20, 2025
      const tenDaysAgo = new Date(2025, 7, 10); // Aug 10, 2025
      expect(formatRelativeTime(tenDaysAgo, now)).toBe('10 Aug');
    });

    it('should return short date with year for different year', () => {
      const now = new Date(2025, 7, 20);
      const lastYear = new Date(2024, 11, 25);
      expect(formatRelativeTime(lastYear, now)).toBe('25 Dec 24');
    });

    it('should return empty string for null date', () => {
      expect(formatRelativeTime(null)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatRelativeTime('invalid')).toBe('');
    });
  });

  describe('Month Names', () => {
    it('should have all 12 months', () => {
      expect(MONTH_NAMES).toHaveLength(12);
    });

    it('should have correct month abbreviations', () => {
      expect(MONTH_NAMES[0]).toBe('Jan');
      expect(MONTH_NAMES[6]).toBe('Jul');
      expect(MONTH_NAMES[11]).toBe('Dec');
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundary dates', () => {
      const formatDate = (date: Date): string => {
        const day = date.getDate();
        const month = MONTH_NAMES[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };

      expect(formatDate(new Date(2024, 11, 31))).toBe('31 Dec 2024');
      expect(formatDate(new Date(2025, 0, 1))).toBe('1 Jan 2025');
    });

    it('should handle leap year dates', () => {
      const formatDate = (date: Date): string => {
        const day = date.getDate();
        const month = MONTH_NAMES[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };

      expect(formatDate(new Date(2024, 1, 29))).toBe('29 Feb 2024');
    });

    it('should handle dates at midnight', () => {
      const toInputDateString = (date: Date): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const midnight = new Date(2025, 7, 10, 0, 0, 0);
      expect(toInputDateString(midnight)).toBe('2025-08-10');
    });
  });
});
