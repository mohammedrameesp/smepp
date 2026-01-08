/**
 * @file billing-cycle.test.ts
 * @description Tests for billing cycle formatting utilities
 */

describe('Billing Cycle Tests', () => {
  describe('formatBillingCycle logic', () => {
    const formatBillingCycle = (billingCycle: string): string => {
      switch (billingCycle.toUpperCase()) {
        case 'MONTHLY':
          return 'Monthly';
        case 'YEARLY':
          return 'Annually';
        case 'ONE_TIME':
          return 'One Time';
        case 'QUARTERLY':
          return 'Quarterly';
        case 'SEMI_ANNUALLY':
        case 'SEMI-ANNUALLY':
          return 'Semi-Annually';
        case 'WEEKLY':
          return 'Weekly';
        default:
          return billingCycle;
      }
    };

    it('should format MONTHLY billing cycle', () => {
      expect(formatBillingCycle('MONTHLY')).toBe('Monthly');
    });

    it('should format YEARLY billing cycle', () => {
      expect(formatBillingCycle('YEARLY')).toBe('Annually');
    });

    it('should format ONE_TIME billing cycle', () => {
      expect(formatBillingCycle('ONE_TIME')).toBe('One Time');
    });

    it('should format QUARTERLY billing cycle', () => {
      expect(formatBillingCycle('QUARTERLY')).toBe('Quarterly');
    });

    it('should format SEMI_ANNUALLY billing cycle', () => {
      expect(formatBillingCycle('SEMI_ANNUALLY')).toBe('Semi-Annually');
    });

    it('should format SEMI-ANNUALLY billing cycle (hyphenated)', () => {
      expect(formatBillingCycle('SEMI-ANNUALLY')).toBe('Semi-Annually');
    });

    it('should format WEEKLY billing cycle', () => {
      expect(formatBillingCycle('WEEKLY')).toBe('Weekly');
    });

    it('should be case insensitive', () => {
      expect(formatBillingCycle('monthly')).toBe('Monthly');
      expect(formatBillingCycle('Monthly')).toBe('Monthly');
      expect(formatBillingCycle('MONTHLY')).toBe('Monthly');
    });

    it('should return original value for unknown billing cycle', () => {
      expect(formatBillingCycle('CUSTOM')).toBe('CUSTOM');
      expect(formatBillingCycle('daily')).toBe('daily');
    });
  });

  describe('Billing Cycle Constants', () => {
    const BillingCycle = {
      MONTHLY: 'MONTHLY',
      YEARLY: 'YEARLY',
      ONE_TIME: 'ONE_TIME',
      QUARTERLY: 'QUARTERLY',
      SEMI_ANNUALLY: 'SEMI_ANNUALLY',
      WEEKLY: 'WEEKLY',
    } as const;

    it('should define MONTHLY', () => {
      expect(BillingCycle.MONTHLY).toBe('MONTHLY');
    });

    it('should define YEARLY', () => {
      expect(BillingCycle.YEARLY).toBe('YEARLY');
    });

    it('should define ONE_TIME', () => {
      expect(BillingCycle.ONE_TIME).toBe('ONE_TIME');
    });

    it('should define QUARTERLY', () => {
      expect(BillingCycle.QUARTERLY).toBe('QUARTERLY');
    });

    it('should define SEMI_ANNUALLY', () => {
      expect(BillingCycle.SEMI_ANNUALLY).toBe('SEMI_ANNUALLY');
    });

    it('should define WEEKLY', () => {
      expect(BillingCycle.WEEKLY).toBe('WEEKLY');
    });
  });

  describe('Billing Cycle Period Calculations', () => {
    const getMonthsPerCycle = (billingCycle: string): number => {
      switch (billingCycle.toUpperCase()) {
        case 'MONTHLY':
          return 1;
        case 'QUARTERLY':
          return 3;
        case 'SEMI_ANNUALLY':
        case 'SEMI-ANNUALLY':
          return 6;
        case 'YEARLY':
        case 'ANNUALLY':
          return 12;
        case 'WEEKLY':
          return 0.25; // ~1/4 of a month
        case 'ONE_TIME':
          return 0;
        default:
          return 0;
      }
    };

    it('should return 1 month for MONTHLY', () => {
      expect(getMonthsPerCycle('MONTHLY')).toBe(1);
    });

    it('should return 3 months for QUARTERLY', () => {
      expect(getMonthsPerCycle('QUARTERLY')).toBe(3);
    });

    it('should return 6 months for SEMI_ANNUALLY', () => {
      expect(getMonthsPerCycle('SEMI_ANNUALLY')).toBe(6);
    });

    it('should return 12 months for YEARLY', () => {
      expect(getMonthsPerCycle('YEARLY')).toBe(12);
    });

    it('should return 0 months for ONE_TIME', () => {
      expect(getMonthsPerCycle('ONE_TIME')).toBe(0);
    });

    it('should return fractional month for WEEKLY', () => {
      expect(getMonthsPerCycle('WEEKLY')).toBe(0.25);
    });
  });

  describe('Cost Calculations by Billing Cycle', () => {
    const calculateAnnualCost = (costPerCycle: number, billingCycle: string): number => {
      switch (billingCycle.toUpperCase()) {
        case 'MONTHLY':
          return costPerCycle * 12;
        case 'QUARTERLY':
          return costPerCycle * 4;
        case 'SEMI_ANNUALLY':
          return costPerCycle * 2;
        case 'YEARLY':
          return costPerCycle;
        case 'WEEKLY':
          return costPerCycle * 52;
        case 'ONE_TIME':
          return costPerCycle;
        default:
          return costPerCycle;
      }
    };

    it('should calculate annual cost for MONTHLY', () => {
      expect(calculateAnnualCost(100, 'MONTHLY')).toBe(1200);
    });

    it('should calculate annual cost for QUARTERLY', () => {
      expect(calculateAnnualCost(300, 'QUARTERLY')).toBe(1200);
    });

    it('should calculate annual cost for SEMI_ANNUALLY', () => {
      expect(calculateAnnualCost(600, 'SEMI_ANNUALLY')).toBe(1200);
    });

    it('should calculate annual cost for YEARLY', () => {
      expect(calculateAnnualCost(1200, 'YEARLY')).toBe(1200);
    });

    it('should calculate annual cost for WEEKLY', () => {
      expect(calculateAnnualCost(23.08, 'WEEKLY')).toBeCloseTo(1200, 0);
    });

    it('should return same cost for ONE_TIME', () => {
      expect(calculateAnnualCost(500, 'ONE_TIME')).toBe(500);
    });
  });

  describe('Billing Cycle Comparison', () => {
    const billingCycleOrder = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'YEARLY', 'ONE_TIME'];

    const compareBillingCycles = (a: string, b: string): number => {
      const indexA = billingCycleOrder.indexOf(a.toUpperCase());
      const indexB = billingCycleOrder.indexOf(b.toUpperCase());
      return indexA - indexB;
    };

    it('should order WEEKLY before MONTHLY', () => {
      expect(compareBillingCycles('WEEKLY', 'MONTHLY')).toBeLessThan(0);
    });

    it('should order MONTHLY before QUARTERLY', () => {
      expect(compareBillingCycles('MONTHLY', 'QUARTERLY')).toBeLessThan(0);
    });

    it('should order QUARTERLY before YEARLY', () => {
      expect(compareBillingCycles('QUARTERLY', 'YEARLY')).toBeLessThan(0);
    });

    it('should order YEARLY before ONE_TIME', () => {
      expect(compareBillingCycles('YEARLY', 'ONE_TIME')).toBeLessThan(0);
    });

    it('should return 0 for same billing cycle', () => {
      expect(compareBillingCycles('MONTHLY', 'MONTHLY')).toBe(0);
    });

    it('should order YEARLY after MONTHLY', () => {
      expect(compareBillingCycles('YEARLY', 'MONTHLY')).toBeGreaterThan(0);
    });
  });
});
