/**
 * @file gratuity.test.ts
 * @description Unit tests for Qatar End of Service Benefits (Gratuity) calculations
 * @module tests/unit/lib/payroll
 *
 * Business Rule: FIN-006
 * - Minimum 12 months of service required for eligibility
 * - 3 weeks of basic salary per year of service
 * - Pro-rated for partial years
 */

import {
  calculateServiceMonths,
  calculateServiceYears,
  calculateGratuity,
  projectGratuity,
  formatGratuityAmount,
  getServiceDurationText,
} from '@/lib/domains/hr/payroll/gratuity';

describe('Gratuity Calculations', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVICE DURATION CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateServiceMonths', () => {
    it('should calculate exact months between dates', () => {
      const joinDate = new Date('2023-01-15');
      const refDate = new Date('2024-01-15');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(12);
    });

    it('should handle partial months (ref day < join day)', () => {
      const joinDate = new Date('2023-01-20');
      const refDate = new Date('2024-01-15');
      // Jan 20 to Jan 15 = 11 months (not 12 because day hasn't reached yet)
      expect(calculateServiceMonths(joinDate, refDate)).toBe(11);
    });

    it('should return 0 for same date', () => {
      const date = new Date('2023-06-15');
      expect(calculateServiceMonths(date, date)).toBe(0);
    });

    it('should return 0 for negative duration', () => {
      const joinDate = new Date('2024-01-01');
      const refDate = new Date('2023-01-01');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(0);
    });

    it('should handle year boundaries correctly', () => {
      const joinDate = new Date('2022-11-15');
      const refDate = new Date('2024-02-15');
      // Nov 2022 to Feb 2024 = 15 months
      expect(calculateServiceMonths(joinDate, refDate)).toBe(15);
    });

    it('should handle leap year dates', () => {
      const joinDate = new Date('2023-02-28');
      const refDate = new Date('2024-02-29'); // Leap year
      expect(calculateServiceMonths(joinDate, refDate)).toBe(12);
    });
  });

  describe('calculateServiceYears', () => {
    it('should calculate exact years', () => {
      const joinDate = new Date('2020-01-01');
      const refDate = new Date('2023-01-01');
      expect(calculateServiceYears(joinDate, refDate)).toBe(3);
    });

    it('should return fractional years for partial service', () => {
      const joinDate = new Date('2023-01-01');
      const refDate = new Date('2023-07-01'); // 6 months
      expect(calculateServiceYears(joinDate, refDate)).toBe(0.5);
    });

    it('should handle 18 months as 1.5 years', () => {
      const joinDate = new Date('2022-01-01');
      const refDate = new Date('2023-07-01'); // 18 months
      expect(calculateServiceYears(joinDate, refDate)).toBe(1.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GRATUITY ELIGIBILITY (FIN-006)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateGratuity - eligibility', () => {
    it('should return 0 gratuity for less than 12 months service', () => {
      const basicSalary = 10000;
      const joinDate = new Date('2024-01-01');
      const termDate = new Date('2024-06-01'); // 5 months

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.ineligible).toBe(true);
      expect(result.gratuityAmount).toBe(0);
      expect(result.ineligibleReason).toContain('Minimum 12 months');
    });

    it('should calculate gratuity for exactly 12 months', () => {
      const basicSalary = 10000;
      const joinDate = new Date('2023-01-01');
      const termDate = new Date('2024-01-01'); // Exactly 12 months

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.ineligible).toBeUndefined();
      expect(result.gratuityAmount).toBeGreaterThan(0);
      expect(result.yearsOfService).toBe(1);
    });

    it('should be ineligible at 11 months', () => {
      const basicSalary = 10000;
      const joinDate = new Date('2023-01-01');
      const termDate = new Date('2023-12-01'); // 11 months

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.ineligible).toBe(true);
      expect(result.monthsOfService).toBe(11);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GRATUITY AMOUNT CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateGratuity - amounts', () => {
    it('should calculate correct gratuity for 1 year service', () => {
      // Basic: 10,000 QAR
      // Daily rate: 10,000 / 30 = 333.33
      // Weekly rate: 333.33 * 7 = 2,333.33
      // 1 year = 3 weeks * 2,333.33 = 7,000 QAR
      const basicSalary = 10000;
      const joinDate = new Date('2023-01-01');
      const termDate = new Date('2024-01-01');

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.dailyRate).toBeCloseTo(333.33, 1);
      expect(result.weeklyRate).toBeCloseTo(2333.33, 1);
      expect(result.gratuityAmount).toBeCloseTo(7000, 0);
    });

    it('should calculate correct gratuity for 3 years service', () => {
      // 3 years * 3 weeks * weekly rate
      const basicSalary = 10000;
      const joinDate = new Date('2021-01-01');
      const termDate = new Date('2024-01-01');

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.yearsOfService).toBe(3);
      expect(result.gratuityAmount).toBeCloseTo(21000, 0); // 3 * 7000
    });

    it('should pro-rate partial years correctly', () => {
      // 1 year 6 months = 1.5 years
      // Gratuity = 1.5 * 3 weeks * weekly rate
      const basicSalary = 10000;
      const joinDate = new Date('2022-07-01');
      const termDate = new Date('2024-01-01'); // 18 months

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.yearsOfService).toBe(1);
      expect(result.monthsOfService).toBe(18);
      expect(result.breakdown.fullYearsAmount).toBeCloseTo(7000, 0);
      expect(result.breakdown.partialYearAmount).toBeCloseTo(3500, 0);
      expect(result.gratuityAmount).toBeCloseTo(10500, 0);
    });

    it('should handle high salary amounts', () => {
      const basicSalary = 50000;
      const joinDate = new Date('2020-01-01');
      const termDate = new Date('2025-01-01'); // 5 years

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      expect(result.yearsOfService).toBe(5);
      // 50000/30*7 = 11666.67 weekly rate
      // 5 * 3 * 11666.67 = 175000
      expect(result.gratuityAmount).toBeCloseTo(175000, 0);
    });

    it('should round amounts to 2 decimal places', () => {
      const basicSalary = 12345;
      const joinDate = new Date('2022-06-15');
      const termDate = new Date('2024-01-15');

      const result = calculateGratuity(basicSalary, joinDate, termDate);

      // Check that amounts are rounded properly
      expect(result.dailyRate.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.weeklyRate.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.gratuityAmount.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GRATUITY PROJECTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('projectGratuity', () => {
    it('should project gratuity for default years', () => {
      const basicSalary = 10000;
      const joinDate = new Date('2020-01-01');

      const projections = projectGratuity(basicSalary, joinDate);

      expect(projections).toHaveLength(4); // Default: 1, 3, 5, 10 years
      expect(projections[0].years).toBe(1);
      expect(projections[1].years).toBe(3);
      expect(projections[2].years).toBe(5);
      expect(projections[3].years).toBe(10);
    });

    it('should project gratuity for custom years', () => {
      const basicSalary = 10000;
      const joinDate = new Date('2020-01-01');

      const projections = projectGratuity(basicSalary, joinDate, [2, 4, 6]);

      expect(projections).toHaveLength(3);
      expect(projections[0].years).toBe(2);
      expect(projections[1].years).toBe(4);
      expect(projections[2].years).toBe(6);
    });

    it('should include valid ISO dates', () => {
      const projections = projectGratuity(10000, new Date('2020-01-01'));

      for (const projection of projections) {
        expect(new Date(projection.date).toISOString()).toBe(projection.date);
      }
    });

    it('should show increasing amounts over time', () => {
      const projections = projectGratuity(10000, new Date('2020-01-01'));

      for (let i = 1; i < projections.length; i++) {
        expect(projections[i].amount).toBeGreaterThan(projections[i - 1].amount);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORMATTING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('formatGratuityAmount', () => {
    it('should format amount with QAR currency', () => {
      const formatted = formatGratuityAmount(10000);
      expect(formatted).toContain('QAR');
    });

    it('should include 2 decimal places', () => {
      const formatted = formatGratuityAmount(10000.5);
      expect(formatted).toMatch(/\.50/);
    });

    it('should handle zero', () => {
      const formatted = formatGratuityAmount(0);
      expect(formatted).toContain('0.00');
    });
  });

  describe('getServiceDurationText', () => {
    it('should format 0 months', () => {
      expect(getServiceDurationText(0)).toBe('0 months');
    });

    it('should format 1 month correctly (singular)', () => {
      expect(getServiceDurationText(1)).toBe('1 month');
    });

    it('should format multiple months correctly (plural)', () => {
      expect(getServiceDurationText(6)).toBe('6 months');
    });

    it('should format 1 year correctly (singular)', () => {
      expect(getServiceDurationText(12)).toBe('1 year');
    });

    it('should format multiple years correctly (plural)', () => {
      expect(getServiceDurationText(36)).toBe('3 years');
    });

    it('should format years and months combined', () => {
      expect(getServiceDurationText(15)).toBe('1 year and 3 months');
    });

    it('should use plurals correctly for combined text', () => {
      expect(getServiceDurationText(25)).toBe('2 years and 1 month');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle zero salary', () => {
      const result = calculateGratuity(0, new Date('2020-01-01'), new Date('2024-01-01'));
      expect(result.gratuityAmount).toBe(0);
      expect(result.dailyRate).toBe(0);
      expect(result.weeklyRate).toBe(0);
    });

    it('should handle very small salary', () => {
      const result = calculateGratuity(100, new Date('2020-01-01'), new Date('2024-01-01'));
      expect(result.gratuityAmount).toBeGreaterThan(0);
    });

    it('should handle very long service (20 years)', () => {
      const result = calculateGratuity(10000, new Date('2000-01-01'), new Date('2020-01-01'));
      expect(result.yearsOfService).toBe(20);
      expect(result.gratuityAmount).toBeCloseTo(140000, 0); // 20 * 7000
    });

    it('should default to current date if termination date not provided', () => {
      const joinDate = new Date('2020-01-01');
      const result = calculateGratuity(10000, joinDate);

      // Should calculate based on today's date
      const expectedMonths = calculateServiceMonths(joinDate, new Date());
      expect(result.monthsOfService).toBe(expectedMonths);
    });
  });
});
