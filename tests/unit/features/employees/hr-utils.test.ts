/**
 * @file hr-utils.test.ts
 * @description Unit tests for HR utility functions including expiry tracking and profile completion
 * @module tests/unit/features/employees
 */

import {
  EXPIRY_WARNING_DAYS,
  PROFILE_COMPLETION_THRESHOLD,
  HR_REQUIRED_FIELDS,
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
} from '@/features/employees/lib/hr-utils';

describe('HR Utility Functions', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Constants', () => {
    it('should have 30-day expiry warning period', () => {
      expect(EXPIRY_WARNING_DAYS).toBe(30);
    });

    it('should have 80% profile completion threshold', () => {
      expect(PROFILE_COMPLETION_THRESHOLD).toBe(80);
    });

    it('should define required HR fields', () => {
      expect(HR_REQUIRED_FIELDS).toContain('dateOfBirth');
      expect(HR_REQUIRED_FIELDS).toContain('qidNumber');
      expect(HR_REQUIRED_FIELDS).toContain('passportNumber');
      expect(HR_REQUIRED_FIELDS).toContain('qatarMobile');
      expect(HR_REQUIRED_FIELDS).toContain('iban');
      expect(HR_REQUIRED_FIELDS).toContain('localEmergencyPhone');
      expect(HR_REQUIRED_FIELDS).toContain('homeEmergencyPhone');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPIRY STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getExpiryStatus', () => {
    it('should return null for null/undefined date', () => {
      expect(getExpiryStatus(null)).toBeNull();
      expect(getExpiryStatus(undefined)).toBeNull();
    });

    it('should return "expired" for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(getExpiryStatus(pastDate)).toBe('expired');
    });

    it('should return "expiring" for dates within warning period', () => {
      const expiringDate = new Date();
      expiringDate.setDate(expiringDate.getDate() + 15); // 15 days from now
      expect(getExpiryStatus(expiringDate)).toBe('expiring');
    });

    it('should return "valid" for dates beyond warning period', () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 60); // 60 days from now
      expect(getExpiryStatus(validDate)).toBe('valid');
    });

    it('should accept string dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      expect(getExpiryStatus(futureDate.toISOString())).toBe('valid');
    });

    it('should accept custom warning days', () => {
      const date = new Date();
      date.setDate(date.getDate() + 45);

      // With default 30-day warning: should be valid
      expect(getExpiryStatus(date, 30)).toBe('valid');

      // With 60-day warning: should be expiring
      expect(getExpiryStatus(date, 60)).toBe('expiring');
    });

    it('should handle edge case: exactly on warning boundary', () => {
      const boundaryDate = new Date();
      boundaryDate.setDate(boundaryDate.getDate() + EXPIRY_WARNING_DAYS);
      boundaryDate.setHours(0, 0, 0, 0);
      expect(getExpiryStatus(boundaryDate)).toBe('expiring');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPIRY INFO
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getExpiryInfo', () => {
    it('should return null values for null date', () => {
      const info = getExpiryInfo(null);
      expect(info.status).toBeNull();
      expect(info.daysRemaining).toBeNull();
    });

    it('should return status and days remaining', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);
      const info = getExpiryInfo(futureDate);

      expect(info.status).toBe('valid');
      // Allow for timezone/rounding differences (±1 day)
      expect(info.daysRemaining).toBeGreaterThanOrEqual(44);
      expect(info.daysRemaining).toBeLessThanOrEqual(46);
    });

    it('should return negative days for expired dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const info = getExpiryInfo(pastDate);

      expect(info.status).toBe('expired');
      // Allow for timezone/rounding differences (±1 day)
      expect(info.daysRemaining).toBeGreaterThanOrEqual(-11);
      expect(info.daysRemaining).toBeLessThanOrEqual(-9);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DAYS REMAINING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getDaysRemaining', () => {
    it('should return null for null date', () => {
      expect(getDaysRemaining(null)).toBeNull();
      expect(getDaysRemaining(undefined)).toBeNull();
    });

    it('should return positive days for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const days = getDaysRemaining(futureDate);
      // Allow for timezone/rounding differences (±1 day)
      expect(days).toBeGreaterThanOrEqual(29);
      expect(days).toBeLessThanOrEqual(31);
    });

    it('should return negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const days = getDaysRemaining(pastDate);
      // Allow for timezone/rounding differences (±1 day)
      expect(days).toBeGreaterThanOrEqual(-6);
      expect(days).toBeLessThanOrEqual(-4);
    });

    it('should return 0 for today', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Noon today
      const result = getDaysRemaining(today);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERALL EXPIRY STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getOverallExpiryStatus', () => {
    it('should return null for empty array', () => {
      expect(getOverallExpiryStatus([])).toBeNull();
    });

    it('should return null for array with only null values', () => {
      expect(getOverallExpiryStatus([null, null])).toBeNull();
    });

    it('should prioritize "expired" status', () => {
      expect(getOverallExpiryStatus(['valid', 'expired', 'expiring'])).toBe('expired');
    });

    it('should prioritize "expiring" over "valid"', () => {
      expect(getOverallExpiryStatus(['valid', 'expiring', 'valid'])).toBe('expiring');
    });

    it('should return "valid" when all are valid', () => {
      expect(getOverallExpiryStatus(['valid', 'valid', 'valid'])).toBe('valid');
    });

    it('should ignore null values in calculation', () => {
      expect(getOverallExpiryStatus([null, 'valid', null])).toBe('valid');
      expect(getOverallExpiryStatus([null, 'expired', null])).toBe('expired');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFILE COMPLETION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateProfileCompletion', () => {
    it('should return 0% for null profile', () => {
      const result = calculateProfileCompletion(null);
      expect(result.percentage).toBe(0);
      expect(result.isComplete).toBe(false);
      expect(result.filledFields).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      const profile = {
        dateOfBirth: '1990-01-01',
        gender: 'male',
        nationality: 'Qatari',
        qatarMobile: '12345678',
      };

      const result = calculateProfileCompletion(profile);
      expect(result.filledFields).toBe(4);
      expect(result.totalFields).toBe(HR_REQUIRED_FIELDS.length);
      expect(result.percentage).toBe(Math.round((4 / HR_REQUIRED_FIELDS.length) * 100));
    });

    it('should return isComplete true when >= 80%', () => {
      // Create profile with 80% of required fields filled
      const requiredCount = HR_REQUIRED_FIELDS.length;
      const neededFields = Math.ceil(requiredCount * 0.8);

      const profile: Record<string, string> = {};
      HR_REQUIRED_FIELDS.slice(0, neededFields).forEach(field => {
        profile[field] = 'test-value';
      });

      const result = calculateProfileCompletion(profile);
      expect(result.isComplete).toBe(true);
      expect(result.percentage).toBeGreaterThanOrEqual(80);
    });

    it('should return missing fields list', () => {
      const profile = {
        dateOfBirth: '1990-01-01',
      };

      const result = calculateProfileCompletion(profile);
      expect(result.missingFields).not.toContain('dateOfBirth');
      expect(result.missingFields).toContain('gender');
      expect(result.missingFields.length).toBe(HR_REQUIRED_FIELDS.length - 1);
    });

    it('should not count empty strings as filled', () => {
      const profile = {
        dateOfBirth: '',
        gender: 'male',
      };

      const result = calculateProfileCompletion(profile);
      expect(result.filledFields).toBe(1);
      expect(result.missingFields).toContain('dateOfBirth');
    });

    it('should accept custom required fields', () => {
      const customFields = ['name', 'email', 'phone'] as const;
      const profile = {
        name: 'John',
        email: 'john@example.com',
        phone: '',
      };

      const result = calculateProfileCompletion(profile, customFields);
      expect(result.totalFields).toBe(3);
      expect(result.filledFields).toBe(2);
      expect(result.percentage).toBe(67);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JSON ARRAY PARSING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('parseJsonArray', () => {
    it('should return empty array for null/undefined', () => {
      expect(parseJsonArray(null)).toEqual([]);
      expect(parseJsonArray(undefined)).toEqual([]);
    });

    it('should return the array if already an array', () => {
      const arr = ['English', 'Arabic'];
      expect(parseJsonArray(arr)).toEqual(arr);
    });

    it('should parse valid JSON array string', () => {
      const jsonStr = '["English", "Arabic", "Hindi"]';
      expect(parseJsonArray(jsonStr)).toEqual(['English', 'Arabic', 'Hindi']);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parseJsonArray('not json')).toEqual([]);
      expect(parseJsonArray('{}')).toEqual([]);
      expect(parseJsonArray('123')).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DATE FORMATTING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('formatDateForPicker', () => {
    it('should return empty string for null/undefined', () => {
      expect(formatDateForPicker(null)).toBe('');
      expect(formatDateForPicker(undefined)).toBe('');
    });

    it('should format Date object to YYYY-MM-DD', () => {
      const date = new Date('2024-06-15T12:30:00Z');
      expect(formatDateForPicker(date)).toBe('2024-06-15');
    });

    it('should format string date to YYYY-MM-DD', () => {
      expect(formatDateForPicker('2024-06-15')).toBe('2024-06-15');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateForPicker('invalid')).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TENURE CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateTenure', () => {
    it('should return "-" for null/undefined date', () => {
      expect(calculateTenure(null)).toBe('-');
      expect(calculateTenure(undefined)).toBe('-');
    });

    it('should return "Today" for joining date today', () => {
      const today = new Date();
      expect(calculateTenure(today)).toBe('Today');
    });

    it('should return days only for recent joins', () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - 15);
      expect(calculateTenure(daysAgo)).toBe('15d');
    });

    it('should return months and days', () => {
      const monthsAgo = new Date();
      monthsAgo.setDate(monthsAgo.getDate() - 45); // ~1 month 15 days
      const result = calculateTenure(monthsAgo);
      expect(result).toContain('m');
      expect(result).toContain('d');
    });

    it('should return years, months, days for long tenure', () => {
      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - 2);
      yearsAgo.setMonth(yearsAgo.getMonth() - 3);
      const result = calculateTenure(yearsAgo);
      expect(result).toContain('y');
    });

    it('should return "-" for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(calculateTenure(futureDate)).toBe('-');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE BADGE VARIANT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getRoleBadgeVariant', () => {
    it('should return "destructive" for ADMIN', () => {
      expect(getRoleBadgeVariant('ADMIN')).toBe('destructive');
    });

    it('should return "default" for EMPLOYEE', () => {
      expect(getRoleBadgeVariant('EMPLOYEE')).toBe('default');
    });

    it('should return "secondary" for other roles', () => {
      expect(getRoleBadgeVariant('MANAGER')).toBe('secondary');
      expect(getRoleBadgeVariant('MEMBER')).toBe('secondary');
      expect(getRoleBadgeVariant('OWNER')).toBe('secondary');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SENSITIVE DATA MASKING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('maskSensitiveData', () => {
    it('should return "-" for null/undefined', () => {
      expect(maskSensitiveData(null)).toBe('-');
      expect(maskSensitiveData(undefined)).toBe('-');
    });

    it('should mask all but last 4 characters by default', () => {
      expect(maskSensitiveData('12345678901')).toBe('*******8901');
    });

    it('should accept custom showLast parameter', () => {
      expect(maskSensitiveData('QA12345678', 6)).toBe('****345678');
    });

    it('should accept custom mask character', () => {
      expect(maskSensitiveData('SECRET123', 3, '#')).toBe('######123');
    });

    it('should fully mask short strings', () => {
      expect(maskSensitiveData('123', 4)).toBe('***');
      expect(maskSensitiveData('AB', 4)).toBe('**');
    });

    it('should handle IBAN masking', () => {
      const iban = 'QA58DOHA00001234567890ABCDEFGHI';
      const masked = maskSensitiveData(iban, 4);
      expect(masked.endsWith('FGHI')).toBe(true);
      expect(masked.startsWith('*')).toBe(true);
    });
  });
});
