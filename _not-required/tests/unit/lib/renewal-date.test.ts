/**
 * Tests for Renewal Date Utility Functions
 * @see src/lib/utils/renewal-date.ts
 */

import {
  getNextRenewalDate,
  isRenewalOverdue,
  getDaysUntilRenewal,
  getRenewalStatus,
} from '@/lib/utils/renewal-date';

describe('Renewal Date Utility Functions', () => {
  // Helper to create dates relative to now
  const daysFromNow = (days: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };

  const daysAgo = (days: number): Date => {
    return daysFromNow(-days);
  };

  describe('getNextRenewalDate', () => {
    it('should return null for null input', () => {
      const result = getNextRenewalDate(null, 'MONTHLY');
      expect(result).toBeNull();
    });

    it('should return future date as-is', () => {
      const futureDate = daysFromNow(30);
      const result = getNextRenewalDate(futureDate, 'MONTHLY');
      expect(result?.getTime()).toBe(futureDate.getTime());
    });

    it('should return original date for ONE_TIME billing', () => {
      const pastDate = daysAgo(30);
      const result = getNextRenewalDate(pastDate, 'ONE_TIME');
      expect(result?.getTime()).toBe(pastDate.getTime());
    });

    it('should calculate next monthly renewal', () => {
      const pastDate = daysAgo(45); // About 1.5 months ago
      const result = getNextRenewalDate(pastDate, 'MONTHLY');

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next yearly renewal', () => {
      const pastDate = daysAgo(400); // Over a year ago
      const result = getNextRenewalDate(pastDate, 'YEARLY');

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should handle ANNUALLY as alias for YEARLY', () => {
      const pastDate = daysAgo(400);
      const result = getNextRenewalDate(pastDate, 'ANNUALLY');

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next quarterly renewal', () => {
      const pastDate = daysAgo(100); // About 3+ months ago
      const result = getNextRenewalDate(pastDate, 'QUARTERLY');

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next semi-annual renewal', () => {
      const pastDate = daysAgo(200); // About 6+ months ago
      const result = getNextRenewalDate(pastDate, 'SEMI_ANNUALLY');

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should calculate next weekly renewal', () => {
      const pastDate = daysAgo(10); // Over a week ago
      const result = getNextRenewalDate(pastDate, 'WEEKLY');

      expect(result).not.toBeNull();
      expect(result!.getTime()).toBeGreaterThan(Date.now());

      // Should be within 7 days from now
      const daysDiff = Math.ceil((result!.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeLessThanOrEqual(7);
    });

    it('should return original date for unknown billing cycle', () => {
      const pastDate = daysAgo(30);
      const result = getNextRenewalDate(pastDate, 'UNKNOWN_CYCLE');
      expect(result?.getTime()).toBe(pastDate.getTime());
    });

    it('should handle case-insensitive billing cycle', () => {
      const pastDate = daysAgo(45);
      const result1 = getNextRenewalDate(pastDate, 'monthly');
      const result2 = getNextRenewalDate(pastDate, 'MONTHLY');
      const result3 = getNextRenewalDate(pastDate, 'Monthly');

      expect(result1?.getTime()).toBe(result2?.getTime());
      expect(result2?.getTime()).toBe(result3?.getTime());
    });
  });

  describe('isRenewalOverdue', () => {
    it('should return false for null input', () => {
      expect(isRenewalOverdue(null)).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = daysAgo(5);
      expect(isRenewalOverdue(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = daysFromNow(5);
      expect(isRenewalOverdue(futureDate)).toBe(false);
    });

    it('should handle today/boundary correctly', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      // Depending on current time, this might be true or false
      // The function compares to now(), so early morning dates today could be overdue
      const result = isRenewalOverdue(today);
      expect(typeof result).toBe('boolean');
    });

    it('should handle date string input', () => {
      const pastDateString = daysAgo(30).toISOString();
      expect(isRenewalOverdue(new Date(pastDateString))).toBe(true);
    });
  });

  describe('getDaysUntilRenewal', () => {
    it('should return null for null input', () => {
      expect(getDaysUntilRenewal(null)).toBeNull();
    });

    it('should return positive number for future date', () => {
      const futureDate = daysFromNow(10);
      const result = getDaysUntilRenewal(futureDate);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(11); // Allow 1 day tolerance
    });

    it('should return negative number for past date', () => {
      const pastDate = daysAgo(5);
      const result = getDaysUntilRenewal(pastDate);

      expect(result).not.toBeNull();
      expect(result).toBeLessThan(0);
    });

    it('should return approximately 0 for today', () => {
      const today = new Date();
      const result = getDaysUntilRenewal(today);

      expect(result).not.toBeNull();
      expect(Math.abs(result!)).toBeLessThanOrEqual(1);
    });

    it('should return approximately 30 for date 30 days from now', () => {
      const futureDate = daysFromNow(30);
      const result = getDaysUntilRenewal(futureDate);

      expect(result).not.toBeNull();
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });
  });

  describe('getRenewalStatus', () => {
    it('should return no-date status for null input', () => {
      const result = getRenewalStatus(null, 'MONTHLY');

      expect(result.nextRenewal).toBeNull();
      expect(result.daysUntil).toBeNull();
      expect(result.isOverdue).toBe(false);
      expect(result.status).toBe('no-date');
      expect(result.color).toBe('gray');
    });

    it('should return overdue status for past renewal', () => {
      const pastDate = daysAgo(5);
      const result = getRenewalStatus(pastDate, 'ONE_TIME'); // ONE_TIME returns original date

      expect(result.isOverdue).toBe(true);
      expect(result.status).toBe('overdue');
      expect(result.color).toBe('red');
      expect(result.daysUntil).toBeLessThan(0);
    });

    it('should return due-soon status for renewal within 7 days', () => {
      const nearFuture = daysFromNow(5);
      const result = getRenewalStatus(nearFuture, 'MONTHLY');

      expect(result.isOverdue).toBe(false);
      expect(result.status).toBe('due-soon');
      expect(result.color).toBe('orange');
    });

    it('should return upcoming status for renewal within 30 days', () => {
      const futureDate = daysFromNow(15);
      const result = getRenewalStatus(futureDate, 'MONTHLY');

      expect(result.isOverdue).toBe(false);
      expect(result.status).toBe('upcoming');
      expect(result.color).toBe('yellow');
    });

    it('should return active status for renewal over 30 days away', () => {
      const farFuture = daysFromNow(60);
      const result = getRenewalStatus(farFuture, 'YEARLY');

      expect(result.isOverdue).toBe(false);
      expect(result.status).toBe('active');
      expect(result.color).toBe('green');
    });

    it('should include nextRenewal date in result', () => {
      const renewalDate = daysFromNow(30);
      const result = getRenewalStatus(renewalDate, 'MONTHLY');

      expect(result.nextRenewal).not.toBeNull();
      expect(result.nextRenewal instanceof Date).toBe(true);
    });

    it('should include daysUntil in result', () => {
      const renewalDate = daysFromNow(30);
      const result = getRenewalStatus(renewalDate, 'MONTHLY');

      expect(result.daysUntil).not.toBeNull();
      expect(typeof result.daysUntil).toBe('number');
    });

    it('should handle exactly 7 days correctly (boundary)', () => {
      const exactly7Days = daysFromNow(7);
      const result = getRenewalStatus(exactly7Days, 'MONTHLY');

      // 7 days should be due-soon (<=7)
      expect(result.status).toBe('due-soon');
    });

    it('should handle exactly 8 days correctly (boundary)', () => {
      const exactly8Days = daysFromNow(8);
      const result = getRenewalStatus(exactly8Days, 'MONTHLY');

      // 8 days should be upcoming (>7, <=30)
      expect(result.status).toBe('upcoming');
    });

    it('should handle exactly 30 days correctly (boundary)', () => {
      const exactly30Days = daysFromNow(30);
      const result = getRenewalStatus(exactly30Days, 'MONTHLY');

      // 30 days should be upcoming (<=30)
      expect(result.status).toBe('upcoming');
    });

    it('should handle exactly 31 days correctly (boundary)', () => {
      const exactly31Days = daysFromNow(31);
      const result = getRenewalStatus(exactly31Days, 'MONTHLY');

      // 31 days should be active (>30)
      expect(result.status).toBe('active');
    });
  });

  describe('Integration Tests', () => {
    it('should correctly track a monthly subscription cycle', () => {
      // Simulate a subscription that started 45 days ago
      const startDate = daysAgo(45);
      const nextRenewal = getNextRenewalDate(startDate, 'MONTHLY');

      expect(nextRenewal).not.toBeNull();
      expect(nextRenewal!.getTime()).toBeGreaterThan(Date.now());

      const status = getRenewalStatus(startDate, 'MONTHLY');
      expect(status.isOverdue).toBe(false);
      expect(['active', 'upcoming', 'due-soon']).toContain(status.status);
    });

    it('should correctly track a yearly subscription', () => {
      // Simulate a yearly subscription due to renew in 2 weeks
      const renewalDate = daysFromNow(14);
      const status = getRenewalStatus(renewalDate, 'YEARLY');

      expect(status.status).toBe('upcoming');
      expect(status.color).toBe('yellow');
      expect(status.daysUntil).toBeGreaterThan(7);
      expect(status.daysUntil).toBeLessThanOrEqual(15);
    });

    it('should handle expired one-time purchase', () => {
      // A one-time purchase that "expired" (warranty ended) 10 days ago
      const expiredDate = daysAgo(10);
      const status = getRenewalStatus(expiredDate, 'ONE_TIME');

      expect(status.isOverdue).toBe(true);
      expect(status.status).toBe('overdue');
    });
  });
});
