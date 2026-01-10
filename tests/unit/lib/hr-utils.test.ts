/**
 * Tests for HR Utilities
 * @see src/lib/hr-utils.ts
 */

import {
  getExpiryStatus,
  getExpiryInfo,
  getDaysRemaining,
  getOverallExpiryStatus,
  calculateProfileCompletion,
  parseJsonArray,
  formatDateForPicker,
  calculateTenure,
  getRoleBadgeVariant,
  maskSensitiveData,
  EXPIRY_WARNING_DAYS,
  PROFILE_COMPLETION_THRESHOLD,
  HR_REQUIRED_FIELDS,
} from '@/features/employees/lib/hr-utils';

describe('HR Utilities', () => {
  describe('Constants', () => {
    it('should have EXPIRY_WARNING_DAYS set to 30', () => {
      expect(EXPIRY_WARNING_DAYS).toBe(30);
    });

    it('should have PROFILE_COMPLETION_THRESHOLD set to 80', () => {
      expect(PROFILE_COMPLETION_THRESHOLD).toBe(80);
    });

    it('should have required HR fields defined', () => {
      expect(HR_REQUIRED_FIELDS).toContain('dateOfBirth');
      expect(HR_REQUIRED_FIELDS).toContain('qidNumber');
      expect(HR_REQUIRED_FIELDS).toContain('passportNumber');
      expect(HR_REQUIRED_FIELDS).toContain('iban');
      expect(HR_REQUIRED_FIELDS.length).toBeGreaterThan(0);
    });
  });

  describe('getExpiryStatus', () => {
    it('should return null for null date', () => {
      expect(getExpiryStatus(null)).toBeNull();
    });

    it('should return null for undefined date', () => {
      expect(getExpiryStatus(undefined)).toBeNull();
    });

    it('should return "expired" for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(getExpiryStatus(pastDate)).toBe('expired');
    });

    it('should return "expired" for date far in the past', () => {
      const oldDate = new Date('2020-01-01');
      expect(getExpiryStatus(oldDate)).toBe('expired');
    });

    it('should return "expiring" for dates within 30 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      expect(getExpiryStatus(soonDate)).toBe('expiring');
    });

    it('should return "expiring" for date exactly 30 days from now', () => {
      const exactDate = new Date();
      exactDate.setHours(0, 0, 0, 0);
      exactDate.setDate(exactDate.getDate() + 30);
      expect(getExpiryStatus(exactDate)).toBe('expiring');
    });

    it('should return "valid" for dates more than 30 days away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      expect(getExpiryStatus(futureDate)).toBe('valid');
    });

    it('should handle string dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      expect(getExpiryStatus(futureDate.toISOString())).toBe('valid');
    });

    it('should handle ISO date strings', () => {
      const pastDateString = '2020-01-01T00:00:00.000Z';
      expect(getExpiryStatus(pastDateString)).toBe('expired');
    });

    it('should accept custom warning days', () => {
      const date = new Date();
      date.setDate(date.getDate() + 45);

      // With default 30 days, should be valid
      expect(getExpiryStatus(date, 30)).toBe('valid');

      // With 60 days warning, should be expiring
      expect(getExpiryStatus(date, 60)).toBe('expiring');
    });
  });

  describe('getExpiryInfo', () => {
    it('should return null status and daysRemaining for null date', () => {
      const info = getExpiryInfo(null);
      expect(info.status).toBeNull();
      expect(info.daysRemaining).toBeNull();
    });

    it('should return correct days remaining for future date', () => {
      const futureDate = new Date();
      futureDate.setHours(0, 0, 0, 0);
      futureDate.setDate(futureDate.getDate() + 10);

      const info = getExpiryInfo(futureDate);
      expect(info.daysRemaining).toBe(10);
      expect(info.status).toBe('expiring');
    });

    it('should return negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setHours(0, 0, 0, 0);
      pastDate.setDate(pastDate.getDate() - 5);

      const info = getExpiryInfo(pastDate);
      expect(info.daysRemaining).toBeLessThan(0);
      expect(info.status).toBe('expired');
    });
  });

  describe('getDaysRemaining', () => {
    it('should return null for null date', () => {
      expect(getDaysRemaining(null)).toBeNull();
    });

    it('should return null for undefined date', () => {
      expect(getDaysRemaining(undefined)).toBeNull();
    });

    it('should return positive number for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const days = getDaysRemaining(futureDate);
      expect(days).toBeGreaterThan(0);
    });

    it('should return negative number for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const days = getDaysRemaining(pastDate);
      expect(days).toBeLessThan(0);
    });

    it('should return 0 or 1 for today', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const days = getDaysRemaining(today);
      // Due to time of day, this could be 0 or 1
      expect(days).toBeLessThanOrEqual(1);
      expect(days).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOverallExpiryStatus', () => {
    it('should return null for empty array', () => {
      expect(getOverallExpiryStatus([])).toBeNull();
    });

    it('should return null for array of nulls', () => {
      expect(getOverallExpiryStatus([null, null, null])).toBeNull();
    });

    it('should return "expired" if any status is expired', () => {
      expect(getOverallExpiryStatus(['valid', 'expired', 'expiring'])).toBe('expired');
    });

    it('should return "expiring" if worst status is expiring', () => {
      expect(getOverallExpiryStatus(['valid', 'expiring', 'valid'])).toBe('expiring');
    });

    it('should return "valid" if all statuses are valid', () => {
      expect(getOverallExpiryStatus(['valid', 'valid', 'valid'])).toBe('valid');
    });

    it('should ignore null values', () => {
      expect(getOverallExpiryStatus([null, 'valid', null])).toBe('valid');
    });

    it('should prioritize expired over expiring', () => {
      expect(getOverallExpiryStatus(['expiring', 'expired'])).toBe('expired');
    });
  });

  describe('calculateProfileCompletion', () => {
    it('should return 0% for null profile', () => {
      const result = calculateProfileCompletion(null);
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
      expect(result.filledFields).toBe(0);
      expect(result.missingFields.length).toBe(HR_REQUIRED_FIELDS.length);
    });

    it('should return 0% for undefined profile', () => {
      const result = calculateProfileCompletion(undefined);
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
    });

    it('should return 0% for empty profile', () => {
      const result = calculateProfileCompletion({});
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
    });

    it('should calculate partial completion correctly', () => {
      const partialProfile = {
        dateOfBirth: new Date(),
        gender: 'Male',
        nationality: 'Qatar',
        qatarMobile: '12345678',
        // Missing other required fields
      };

      const result = calculateProfileCompletion(partialProfile);
      expect(result.filledFields).toBe(4);
      expect(result.percentage).toBeGreaterThan(0);
      expect(result.percentage).toBeLessThan(100);
    });

    it('should mark profile as complete when >= 80%', () => {
      // Create profile with 80%+ of required fields
      const almostCompleteProfile: Record<string, unknown> = {};
      const fieldsToFill = Math.ceil(HR_REQUIRED_FIELDS.length * 0.8);

      HR_REQUIRED_FIELDS.slice(0, fieldsToFill).forEach(field => {
        almostCompleteProfile[field] = 'test-value';
      });

      const result = calculateProfileCompletion(almostCompleteProfile);
      expect(result.isComplete).toBe(true);
      expect(result.percentage).toBeGreaterThanOrEqual(80);
    });

    it('should list missing fields correctly', () => {
      const profileWithSomeFields = {
        dateOfBirth: new Date(),
        gender: 'Female',
      };

      const result = calculateProfileCompletion(profileWithSomeFields);
      expect(result.missingFields).not.toContain('dateOfBirth');
      expect(result.missingFields).not.toContain('gender');
      expect(result.missingFields).toContain('qidNumber');
    });

    it('should not count empty strings as filled', () => {
      const profileWithEmptyStrings = {
        dateOfBirth: '',
        gender: '',
      };

      const result = calculateProfileCompletion(profileWithEmptyStrings);
      expect(result.filledFields).toBe(0);
    });

    it('should accept custom required fields', () => {
      const customFields = ['field1', 'field2', 'field3'] as const;
      const profile = {
        field1: 'value1',
        field2: 'value2',
      };

      const result = calculateProfileCompletion(profile, customFields);
      expect(result.filledFields).toBe(2);
      expect(result.totalFields).toBe(3);
      expect(result.percentage).toBe(67); // 2/3 rounded
    });
  });

  describe('parseJsonArray', () => {
    it('should return empty array for null', () => {
      expect(parseJsonArray(null)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseJsonArray(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseJsonArray('')).toEqual([]);
    });

    it('should return array as-is if already an array', () => {
      const arr = ['a', 'b', 'c'];
      expect(parseJsonArray(arr)).toEqual(arr);
    });

    it('should parse valid JSON array string', () => {
      const jsonString = '["English", "Arabic", "Hindi"]';
      expect(parseJsonArray(jsonString)).toEqual(['English', 'Arabic', 'Hindi']);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parseJsonArray('not valid json')).toEqual([]);
    });

    it('should return empty array for JSON object (not array)', () => {
      expect(parseJsonArray('{"key": "value"}')).toEqual([]);
    });

    it('should handle JSON with numbers', () => {
      expect(parseJsonArray('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should handle nested arrays', () => {
      const result = parseJsonArray('[["a", "b"], ["c"]]');
      expect(result).toHaveLength(2);
    });
  });

  describe('formatDateForPicker', () => {
    it('should return empty string for null', () => {
      expect(formatDateForPicker(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDateForPicker(undefined)).toBe('');
    });

    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2025-08-15T12:00:00Z');
      const result = formatDateForPicker(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe('2025-08-15');
    });

    it('should handle date string input', () => {
      const result = formatDateForPicker('2025-01-20T00:00:00.000Z');
      expect(result).toBe('2025-01-20');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateForPicker('invalid-date')).toBe('');
    });

    it('should handle single digit months and days', () => {
      const date = new Date('2025-01-05T12:00:00Z');
      expect(formatDateForPicker(date)).toBe('2025-01-05');
    });
  });

  describe('calculateTenure', () => {
    it('should return "-" for null', () => {
      expect(calculateTenure(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(calculateTenure(undefined)).toBe('-');
    });

    it('should return "Today" for today\'s date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(calculateTenure(today)).toBe('Today');
    });

    it('should return "-" for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(calculateTenure(future)).toBe('-');
    });

    it('should return days for recent join', () => {
      const recent = new Date();
      recent.setDate(recent.getDate() - 15);
      const result = calculateTenure(recent);
      expect(result).toContain('d');
      expect(result).not.toContain('y');
      expect(result).not.toContain('m');
    });

    it('should return months for a few months ago', () => {
      const monthsAgo = new Date();
      monthsAgo.setDate(monthsAgo.getDate() - 75); // ~2.5 months
      const result = calculateTenure(monthsAgo);
      expect(result).toContain('m');
    });

    it('should return years and months for long tenure', () => {
      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - 2);
      yearsAgo.setMonth(yearsAgo.getMonth() - 3);
      const result = calculateTenure(yearsAgo);
      expect(result).toContain('y');
    });

    it('should handle string date input', () => {
      const dateString = new Date();
      dateString.setDate(dateString.getDate() - 400); // > 1 year
      const result = calculateTenure(dateString.toISOString());
      expect(result).toContain('y');
    });
  });

  describe('getRoleBadgeVariant', () => {
    it('should return "destructive" for ADMIN', () => {
      expect(getRoleBadgeVariant('ADMIN')).toBe('destructive');
    });

    it('should return "default" for EMPLOYEE', () => {
      expect(getRoleBadgeVariant('EMPLOYEE')).toBe('default');
    });

    it('should return "default" for EMPLOYEE', () => {
      expect(getRoleBadgeVariant('EMPLOYEE')).toBe('default');
    });

    it('should return "secondary" for unknown roles', () => {
      expect(getRoleBadgeVariant('UNKNOWN_ROLE')).toBe('secondary');
      expect(getRoleBadgeVariant('')).toBe('secondary');
    });
  });

  describe('maskSensitiveData', () => {
    it('should return "-" for null', () => {
      expect(maskSensitiveData(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(maskSensitiveData(undefined)).toBe('-');
    });

    it('should return "-" for empty string', () => {
      expect(maskSensitiveData('')).toBe('-');
    });

    it('should show last 4 characters by default', () => {
      const result = maskSensitiveData('1234567890');
      expect(result).toBe('******7890');
      expect(result.endsWith('7890')).toBe(true);
    });

    it('should mask short strings completely', () => {
      const result = maskSensitiveData('123');
      expect(result).toBe('***');
    });

    it('should handle exactly 4 character strings', () => {
      const result = maskSensitiveData('1234');
      expect(result).toBe('****');
    });

    it('should respect custom showLast parameter', () => {
      const result = maskSensitiveData('1234567890', 2);
      expect(result).toBe('********90');
    });

    it('should use custom mask character', () => {
      const result = maskSensitiveData('1234567890', 4, '#');
      expect(result).toBe('######7890');
    });

    it('should work with IBAN-like strings', () => {
      const iban = 'QA58DOHA00001234567890ABCDEF';
      const result = maskSensitiveData(iban);
      expect(result.length).toBe(iban.length);
      expect(result.endsWith('CDEF')).toBe(true);
    });

    it('should work with QID numbers', () => {
      const qid = '28412345678';
      const result = maskSensitiveData(qid);
      expect(result).toBe('*******5678');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Date at midnight', () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      midnight.setDate(midnight.getDate() + 15);

      expect(getExpiryStatus(midnight)).toBe('expiring');
    });

    it('should handle Date at 23:59:59', () => {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      endOfDay.setDate(endOfDay.getDate() + 15);

      expect(getExpiryStatus(endOfDay)).toBe('expiring');
    });

    it('should handle very old dates for tenure', () => {
      const veryOld = new Date('2000-01-01');
      const result = calculateTenure(veryOld);
      expect(result).toContain('y');
      // Should be at least 20 years
      const yearsMatch = result.match(/(\d+)y/);
      if (yearsMatch) {
        expect(parseInt(yearsMatch[1])).toBeGreaterThanOrEqual(20);
      }
    });

    it('should handle profile with all null values', () => {
      const nullProfile = {
        dateOfBirth: null,
        gender: null,
        nationality: null,
      };

      const result = calculateProfileCompletion(nullProfile);
      expect(result.filledFields).toBe(0);
    });

    it('should handle unicode in masked data', () => {
      const unicodeString = '测试数据1234';
      const result = maskSensitiveData(unicodeString);
      expect(result.endsWith('1234')).toBe(true);
    });
  });
});
