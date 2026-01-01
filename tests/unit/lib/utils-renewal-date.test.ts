import { getNextRenewalDate, getDaysUntilRenewal, isRenewalOverdue } from '@/lib/utils/renewal-date';
import { BillingCycle } from '@prisma/client';

describe('Renewal Date Utilities', () => {
  describe('getNextRenewalDate', () => {
    it('should return future date as-is if already in future', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      const nextRenewal = getNextRenewalDate(futureDate, BillingCycle.MONTHLY);
      expect(nextRenewal).toBeDefined();
      expect(nextRenewal?.getTime()).toBe(futureDate.getTime());
    });

    it('should calculate next monthly renewal for past date', () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 2); // 2 months ago

      const nextRenewal = getNextRenewalDate(pastDate, BillingCycle.MONTHLY);
      expect(nextRenewal).toBeDefined();
      expect(nextRenewal!.getTime()).toBeGreaterThan(new Date().getTime());
      expect(nextRenewal?.getDate()).toBe(pastDate.getDate());
    });

    it('should calculate next yearly renewal for past date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1); // 1 year ago

      const nextRenewal = getNextRenewalDate(pastDate, BillingCycle.YEARLY);
      expect(nextRenewal).toBeDefined();
      expect(nextRenewal!.getTime()).toBeGreaterThan(new Date().getTime());
    });

    it('should handle ONE_TIME billing cycle', () => {
      const pastDate = new Date('2024-01-15');
      const nextRenewal = getNextRenewalDate(pastDate, BillingCycle.ONE_TIME);
      // ONE_TIME should return the original date
      expect(nextRenewal).toBeDefined();
      expect(nextRenewal?.getFullYear()).toBe(2024);
    });

    it('should return null for null input', () => {
      const nextRenewal = getNextRenewalDate(null, BillingCycle.MONTHLY);
      expect(nextRenewal).toBeNull();
    });
  });

  describe('isRenewalOverdue', () => {
    it('should return true for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(isRenewalOverdue(pastDate)).toBe(true);
    });

    it('should return false for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(isRenewalOverdue(futureDate)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRenewalOverdue(null)).toBe(false);
    });
  });

  describe('getDaysUntilRenewal', () => {
    it('should return positive number for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const days = getDaysUntilRenewal(futureDate);
      expect(days).toBeGreaterThanOrEqual(4);
      expect(days).toBeLessThanOrEqual(6);
    });

    it('should return negative number for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const days = getDaysUntilRenewal(pastDate);
      expect(days).toBeLessThan(0);
    });

    it('should return null for null input', () => {
      expect(getDaysUntilRenewal(null)).toBeNull();
    });
  });
});
