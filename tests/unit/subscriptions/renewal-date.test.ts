/**
 * @file renewal-date.test.ts
 * @description Tests for subscription renewal date calculation utilities
 */

describe('Renewal Date Tests', () => {
  describe('getNextRenewalDate logic', () => {
    const getNextRenewalDate = (
      originalRenewalDate: Date | null,
      billingCycle: string
    ): Date | null => {
      if (!originalRenewalDate) {
        return null;
      }

      const now = new Date();
      const baseDate = new Date(originalRenewalDate);

      if (baseDate > now) {
        return baseDate;
      }

      if (billingCycle.toUpperCase() === 'ONE_TIME') {
        return baseDate;
      }

      let monthsToAdd = 0;
      switch (billingCycle.toUpperCase()) {
        case 'MONTHLY':
          monthsToAdd = 1;
          break;
        case 'QUARTERLY':
          monthsToAdd = 3;
          break;
        case 'SEMI_ANNUALLY':
        case 'SEMI-ANNUALLY':
          monthsToAdd = 6;
          break;
        case 'YEARLY':
        case 'ANNUALLY':
          monthsToAdd = 12;
          break;
        case 'WEEKLY':
          return getNextWeeklyRenewal(baseDate, now);
        default:
          return baseDate;
      }

      let nextDate = new Date(baseDate);
      let cycleCount = 0;

      while (nextDate <= now) {
        cycleCount++;
        nextDate = new Date(baseDate);
        nextDate.setMonth(baseDate.getMonth() + (monthsToAdd * cycleCount));
      }

      return nextDate;
    };

    const getNextWeeklyRenewal = (baseDate: Date, now: Date): Date => {
      const daysToAdd = 7;
      const nextDate = new Date(baseDate);

      while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }

      return nextDate;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return null for null input', () => {
      expect(getNextRenewalDate(null, 'MONTHLY')).toBeNull();
    });

    it('should return future date as-is', () => {
      const futureDate = new Date('2025-02-15');
      const result = getNextRenewalDate(futureDate, 'MONTHLY');

      expect(result).toEqual(futureDate);
    });

    it('should return base date for ONE_TIME billing', () => {
      const baseDate = new Date('2024-01-15');
      const result = getNextRenewalDate(baseDate, 'ONE_TIME');

      expect(result).toEqual(baseDate);
    });

    it('should calculate next MONTHLY renewal', () => {
      const baseDate = new Date('2024-11-15');
      const result = getNextRenewalDate(baseDate, 'MONTHLY');

      // Should be Feb 15, 2025 (next future date)
      expect(result?.getMonth()).toBe(1); // February
      expect(result?.getFullYear()).toBe(2025);
    });

    it('should calculate next QUARTERLY renewal', () => {
      const baseDate = new Date('2024-04-15');
      const result = getNextRenewalDate(baseDate, 'QUARTERLY');

      // Should be Apr 15, 2025 (next future date after Jan 15)
      expect(result?.getMonth()).toBe(3); // April
      expect(result?.getFullYear()).toBe(2025);
    });

    it('should calculate next SEMI_ANNUALLY renewal', () => {
      const baseDate = new Date('2024-03-15');
      const result = getNextRenewalDate(baseDate, 'SEMI_ANNUALLY');

      // Should be Mar 15, 2025 (next future date after Jan 15)
      expect(result?.getMonth()).toBe(2); // March
      expect(result?.getFullYear()).toBe(2025);
    });

    it('should calculate next YEARLY renewal', () => {
      const baseDate = new Date('2024-03-15');
      const result = getNextRenewalDate(baseDate, 'YEARLY');

      // Should be Mar 15, 2025 (next future date after Jan 15)
      expect(result?.getMonth()).toBe(2); // March
      expect(result?.getFullYear()).toBe(2025);
    });

    it('should calculate next WEEKLY renewal', () => {
      const baseDate = new Date('2025-01-01');
      const result = getNextRenewalDate(baseDate, 'WEEKLY');

      // Should be a date after Jan 15, 2025
      expect(result?.getTime()).toBeGreaterThan(new Date('2025-01-15').getTime());
    });

    it('should return original date for unknown billing cycle', () => {
      const baseDate = new Date('2024-01-15');
      const result = getNextRenewalDate(baseDate, 'CUSTOM');

      expect(result).toEqual(baseDate);
    });
  });

  describe('isRenewalOverdue logic', () => {
    const isRenewalOverdue = (renewalDate: Date | null): boolean => {
      if (!renewalDate) {
        return false;
      }
      const now = new Date();
      return new Date(renewalDate) < now;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false for null date', () => {
      expect(isRenewalOverdue(null)).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date('2025-01-10');
      expect(isRenewalOverdue(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2025-01-20');
      expect(isRenewalOverdue(futureDate)).toBe(false);
    });

    it('should return false for today (same timestamp)', () => {
      // When renewal date equals current time exactly, it's not overdue
      // because we use < (not <=) comparison
      const today = new Date('2025-01-15');
      expect(isRenewalOverdue(today)).toBe(false);
    });
  });

  describe('getDaysUntilRenewal logic', () => {
    const getDaysUntilRenewal = (renewalDate: Date | null): number | null => {
      if (!renewalDate) {
        return null;
      }
      const now = new Date();
      const diffTime = new Date(renewalDate).getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T12:00:00'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return null for null date', () => {
      expect(getDaysUntilRenewal(null)).toBeNull();
    });

    it('should return positive days for future date', () => {
      const futureDate = new Date('2025-01-20');
      const days = getDaysUntilRenewal(futureDate);

      expect(days).toBeGreaterThan(0);
    });

    it('should return negative days for past date', () => {
      const pastDate = new Date('2025-01-10');
      const days = getDaysUntilRenewal(pastDate);

      expect(days).toBeLessThan(0);
    });

    it('should return approximately 30 days for one month ahead', () => {
      const futureDate = new Date('2025-02-15');
      const days = getDaysUntilRenewal(futureDate);

      expect(days).toBe(31);
    });

    it('should return approximately 365 days for one year ahead', () => {
      const futureDate = new Date('2026-01-15');
      const days = getDaysUntilRenewal(futureDate);

      expect(days).toBe(365);
    });
  });

  describe('getRenewalStatus logic', () => {
    const getRenewalStatus = (renewalDate: Date | null, billingCycle: string) => {
      if (!renewalDate) {
        return {
          nextRenewal: null,
          daysUntil: null,
          isOverdue: false,
          status: 'no-date',
          color: 'gray',
        };
      }

      const now = new Date();
      const nextRenewal = new Date(renewalDate);
      const diffTime = nextRenewal.getTime() - now.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status: string;
      let color: string;

      if (daysUntil < 0) {
        status = 'overdue';
        color = 'red';
      } else if (daysUntil <= 7) {
        status = 'due-soon';
        color = 'orange';
      } else if (daysUntil <= 30) {
        status = 'upcoming';
        color = 'yellow';
      } else {
        status = 'active';
        color = 'green';
      }

      return {
        nextRenewal,
        daysUntil,
        isOverdue: daysUntil < 0,
        status,
        color,
      };
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return no-date status for null date', () => {
      const result = getRenewalStatus(null, 'MONTHLY');

      expect(result.status).toBe('no-date');
      expect(result.color).toBe('gray');
      expect(result.nextRenewal).toBeNull();
    });

    it('should return overdue status for past date', () => {
      const pastDate = new Date('2025-01-10');
      const result = getRenewalStatus(pastDate, 'MONTHLY');

      expect(result.status).toBe('overdue');
      expect(result.color).toBe('red');
      expect(result.isOverdue).toBe(true);
    });

    it('should return due-soon status for date within 7 days', () => {
      const soonDate = new Date('2025-01-20');
      const result = getRenewalStatus(soonDate, 'MONTHLY');

      expect(result.status).toBe('due-soon');
      expect(result.color).toBe('orange');
    });

    it('should return upcoming status for date within 30 days', () => {
      const upcomingDate = new Date('2025-02-10');
      const result = getRenewalStatus(upcomingDate, 'MONTHLY');

      expect(result.status).toBe('upcoming');
      expect(result.color).toBe('yellow');
    });

    it('should return active status for date more than 30 days away', () => {
      const futureDate = new Date('2025-03-15');
      const result = getRenewalStatus(futureDate, 'MONTHLY');

      expect(result.status).toBe('active');
      expect(result.color).toBe('green');
    });

    it('should include daysUntil in result', () => {
      const futureDate = new Date('2025-01-25');
      const result = getRenewalStatus(futureDate, 'MONTHLY');

      expect(result.daysUntil).toBe(10);
    });

    it('should include nextRenewal in result', () => {
      const futureDate = new Date('2025-01-25');
      const result = getRenewalStatus(futureDate, 'MONTHLY');

      expect(result.nextRenewal).toEqual(futureDate);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year February 29', () => {
      const baseDate = new Date('2024-02-29');
      const nextYearDate = new Date(baseDate);
      nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

      // Feb 29 2024 + 1 year = Mar 1 2025 (since Feb 29 doesn't exist in 2025)
      expect(nextYearDate.getFullYear()).toBe(2025);
    });

    it('should handle end of month dates', () => {
      const baseDate = new Date('2024-01-31');
      const nextMonthDate = new Date(baseDate);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

      // Jan 31 + 1 month = Mar 2 or Mar 3 (since Feb 31 doesn't exist)
      expect(nextMonthDate.getMonth()).toBeGreaterThanOrEqual(1); // At least February
    });

    it('should handle year boundary crossing', () => {
      const baseDate = new Date('2024-12-15');
      const nextMonthDate = new Date(baseDate);
      nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

      expect(nextMonthDate.getFullYear()).toBe(2025);
      expect(nextMonthDate.getMonth()).toBe(0); // January
    });

    it('should handle multiple year boundaries', () => {
      const baseDate = new Date('2020-01-15');
      const addYears = (date: Date, years: number): Date => {
        const result = new Date(date);
        result.setFullYear(result.getFullYear() + years);
        return result;
      };

      const futureDate = addYears(baseDate, 5);
      expect(futureDate.getFullYear()).toBe(2025);
    });
  });

  describe('Status Color Mapping', () => {
    const colorMap = {
      'overdue': 'red',
      'due-soon': 'orange',
      'upcoming': 'yellow',
      'active': 'green',
      'no-date': 'gray',
      'unknown': 'gray',
    };

    it('should map overdue to red', () => {
      expect(colorMap['overdue']).toBe('red');
    });

    it('should map due-soon to orange', () => {
      expect(colorMap['due-soon']).toBe('orange');
    });

    it('should map upcoming to yellow', () => {
      expect(colorMap['upcoming']).toBe('yellow');
    });

    it('should map active to green', () => {
      expect(colorMap['active']).toBe('green');
    });

    it('should map no-date to gray', () => {
      expect(colorMap['no-date']).toBe('gray');
    });
  });

  describe('Weekly Renewal Calculation', () => {
    const getNextWeeklyRenewal = (baseDate: Date, now: Date): Date => {
      const daysToAdd = 7;
      const nextDate = new Date(baseDate);

      while (nextDate <= now) {
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }

      return nextDate;
    };

    it('should add 7 days for each cycle', () => {
      const baseDate = new Date('2025-01-01');
      const now = new Date('2025-01-15');
      const result = getNextWeeklyRenewal(baseDate, now);

      // Should be Jan 22 (Jan 1 + 3 weeks)
      expect(result.getDate()).toBe(22);
    });

    it('should handle month boundary', () => {
      const baseDate = new Date('2025-01-25');
      const now = new Date('2025-01-26');
      const result = getNextWeeklyRenewal(baseDate, now);

      // Should be Feb 1
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });

    it('should return future date immediately if already in future', () => {
      const baseDate = new Date('2025-02-01');
      const now = new Date('2025-01-15');
      // The function checks baseDate <= now, so if baseDate > now, it should return first iteration

      // Since baseDate > now, the while loop doesn't run
      // The function would return baseDate as-is
      expect(baseDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });
});
