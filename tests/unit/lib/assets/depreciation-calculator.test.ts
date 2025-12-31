/**
 * @file depreciation-calculator.test.ts
 * @description Unit tests for asset depreciation calculator (straight-line method)
 * @module tests/unit/lib/assets
 *
 * Tests cover:
 * - Monthly depreciation calculation
 * - Depreciation schedule generation
 * - Summary statistics
 * - Pro-rata calculations for mid-month acquisitions
 * - Edge cases (zero values, fully depreciated assets)
 */

import {
  calculateMonthlyDepreciation,
  generateDepreciationSchedule,
  calculateDepreciationSummary,
  calculateMonthsElapsed,
  isPeriodAlreadyProcessed,
  DepreciationInput,
} from '@/lib/domains/operations/assets/depreciation/calculator';

describe('Depreciation Calculator', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST DATA FIXTURES
  // ═══════════════════════════════════════════════════════════════════════════════

  const standardAsset: DepreciationInput = {
    acquisitionCost: 120000,
    salvageValue: 12000,
    usefulLifeMonths: 60, // 5 years
    depreciationStartDate: new Date('2024-01-01'),
    accumulatedDepreciation: 0,
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // MONTHLY DEPRECIATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateMonthlyDepreciation', () => {
    it('should calculate correct monthly depreciation amount', () => {
      // (120000 - 12000) / 60 = 1800 per month
      const result = calculateMonthlyDepreciation(standardAsset, new Date('2024-01-15'));

      expect(result).not.toBeNull();
      expect(result!.monthlyAmount).toBe(1800);
    });

    it('should return null for zero acquisition cost', () => {
      const invalidAsset = { ...standardAsset, acquisitionCost: 0 };
      const result = calculateMonthlyDepreciation(invalidAsset);

      expect(result).toBeNull();
    });

    it('should return null for zero useful life', () => {
      const invalidAsset = { ...standardAsset, usefulLifeMonths: 0 };
      const result = calculateMonthlyDepreciation(invalidAsset);

      expect(result).toBeNull();
    });

    it('should return null when salvage value exceeds cost', () => {
      const invalidAsset = { ...standardAsset, salvageValue: 150000 };
      const result = calculateMonthlyDepreciation(invalidAsset);

      expect(result).toBeNull();
    });

    it('should return null for fully depreciated asset', () => {
      const depreciatedAsset = {
        ...standardAsset,
        accumulatedDepreciation: 108000, // Fully depreciated (120000 - 12000)
      };
      const result = calculateMonthlyDepreciation(depreciatedAsset, new Date('2029-01-15'));

      expect(result).toBeNull();
    });

    it('should calculate pro-rata for mid-month acquisition', () => {
      const midMonthAsset = {
        ...standardAsset,
        depreciationStartDate: new Date('2024-01-15'),
      };
      const result = calculateMonthlyDepreciation(midMonthAsset, new Date('2024-01-20'));

      expect(result).not.toBeNull();
      expect(result!.proRataFactor).toBeLessThan(1);
      expect(result!.proRataFactor).toBeGreaterThan(0.5); // ~17/31 days
    });

    it('should return null when calculation date is before start date', () => {
      const result = calculateMonthlyDepreciation(standardAsset, new Date('2023-12-15'));

      expect(result).toBeNull();
    });

    it('should cap depreciation at remaining depreciable amount', () => {
      const nearlyDepreciatedAsset = {
        ...standardAsset,
        accumulatedDepreciation: 107500, // Only 500 left
      };
      const result = calculateMonthlyDepreciation(nearlyDepreciatedAsset, new Date('2028-12-15'));

      expect(result).not.toBeNull();
      expect(result!.monthlyAmount).toBe(500); // Capped at remaining amount
      expect(result!.isFullyDepreciated).toBe(true);
    });

    it('should set correct period start and end dates', () => {
      const result = calculateMonthlyDepreciation(standardAsset, new Date('2024-03-15'));

      expect(result).not.toBeNull();
      expect(result!.periodStart.getDate()).toBe(1);
      expect(result!.periodStart.getMonth()).toBe(2); // March (0-indexed)
      expect(result!.periodEnd.getDate()).toBe(31); // March has 31 days
    });

    it('should update accumulated and net book values correctly', () => {
      const partiallyDepreciatedAsset = {
        ...standardAsset,
        accumulatedDepreciation: 36000, // 20 months depreciated
      };
      const result = calculateMonthlyDepreciation(partiallyDepreciatedAsset, new Date('2025-09-15'));

      expect(result).not.toBeNull();
      expect(result!.newAccumulatedAmount).toBe(37800); // 36000 + 1800
      expect(result!.newNetBookValue).toBe(82200); // 120000 - 37800
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEPRECIATION SCHEDULE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('generateDepreciationSchedule', () => {
    it('should generate complete schedule for asset', () => {
      const schedule = generateDepreciationSchedule(standardAsset);

      expect(schedule.length).toBe(60); // 5 years = 60 months
    });

    it('should have first entry with correct values', () => {
      const schedule = generateDepreciationSchedule(standardAsset);

      expect(schedule[0].monthlyAmount).toBe(1800);
      expect(schedule[0].newAccumulatedAmount).toBe(1800);
      expect(schedule[0].newNetBookValue).toBe(118200); // 120000 - 1800
    });

    it('should have last entry showing fully depreciated', () => {
      const schedule = generateDepreciationSchedule(standardAsset);
      const lastEntry = schedule[schedule.length - 1];

      expect(lastEntry.isFullyDepreciated).toBe(true);
      expect(lastEntry.newNetBookValue).toBe(12000); // Salvage value
    });

    it('should show increasing accumulated depreciation', () => {
      const schedule = generateDepreciationSchedule(standardAsset);

      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].newAccumulatedAmount)
          .toBeGreaterThan(schedule[i - 1].newAccumulatedAmount);
      }
    });

    it('should show decreasing net book value', () => {
      const schedule = generateDepreciationSchedule(standardAsset);

      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].newNetBookValue)
          .toBeLessThan(schedule[i - 1].newNetBookValue);
      }
    });

    it('should handle partially depreciated asset', () => {
      const partialAsset = {
        ...standardAsset,
        accumulatedDepreciation: 36000, // 20 months done
      };
      const schedule = generateDepreciationSchedule(partialAsset);

      expect(schedule.length).toBe(40); // 40 months remaining
    });

    it('should return empty array for fully depreciated asset', () => {
      const depreciatedAsset = {
        ...standardAsset,
        accumulatedDepreciation: 108000,
      };
      const schedule = generateDepreciationSchedule(depreciatedAsset);

      expect(schedule.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEPRECIATION SUMMARY TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateDepreciationSummary', () => {
    it('should calculate correct depreciable amount', () => {
      const summary = calculateDepreciationSummary(standardAsset);

      expect(summary.depreciableAmount).toBe(108000); // 120000 - 12000
    });

    it('should calculate correct monthly and annual rates', () => {
      const summary = calculateDepreciationSummary(standardAsset);

      expect(summary.monthlyDepreciation).toBe(1800); // 108000 / 60
      expect(summary.annualDepreciation).toBe(21600); // 1800 * 12
    });

    it('should calculate correct net book value', () => {
      const partialAsset = {
        ...standardAsset,
        accumulatedDepreciation: 36000,
      };
      const summary = calculateDepreciationSummary(partialAsset);

      expect(summary.netBookValue).toBe(84000); // 120000 - 36000
    });

    it('should calculate remaining months correctly', () => {
      const partialAsset = {
        ...standardAsset,
        accumulatedDepreciation: 36000, // 20 months done
      };
      const summary = calculateDepreciationSummary(partialAsset);

      expect(summary.remainingMonths).toBe(40); // 60 - 20
    });

    it('should calculate percent depreciated', () => {
      const partialAsset = {
        ...standardAsset,
        accumulatedDepreciation: 54000, // Half depreciated
      };
      const summary = calculateDepreciationSummary(partialAsset);

      expect(summary.percentDepreciated).toBe(50);
    });

    it('should indicate fully depreciated status', () => {
      const depreciatedAsset = {
        ...standardAsset,
        accumulatedDepreciation: 108000,
      };
      const summary = calculateDepreciationSummary(depreciatedAsset);

      expect(summary.isFullyDepreciated).toBe(true);
      expect(summary.remainingMonths).toBe(0);
    });

    it('should handle asset with zero salvage value', () => {
      const zeroSalvageAsset = {
        ...standardAsset,
        salvageValue: 0,
      };
      const summary = calculateDepreciationSummary(zeroSalvageAsset);

      expect(summary.depreciableAmount).toBe(120000);
      expect(summary.monthlyDepreciation).toBe(2000); // 120000 / 60
    });

    it('should round all values to 2 decimal places', () => {
      const oddAsset: DepreciationInput = {
        acquisitionCost: 12345.67,
        salvageValue: 1234.56,
        usefulLifeMonths: 37,
        depreciationStartDate: new Date('2024-01-01'),
        accumulatedDepreciation: 1000,
      };
      const summary = calculateDepreciationSummary(oddAsset);

      // Check that values are properly rounded
      const checkDecimalPlaces = (value: number) => {
        const decimalPart = value.toString().split('.')[1];
        return !decimalPart || decimalPart.length <= 2;
      };

      expect(checkDecimalPlaces(summary.depreciableAmount)).toBe(true);
      expect(checkDecimalPlaces(summary.monthlyDepreciation)).toBe(true);
      expect(checkDecimalPlaces(summary.annualDepreciation)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateMonthsElapsed', () => {
    it('should calculate months between dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-06-01');

      expect(calculateMonthsElapsed(start, end)).toBe(5);
    });

    it('should handle year boundaries', () => {
      const start = new Date('2023-11-01');
      const end = new Date('2024-02-01');

      expect(calculateMonthsElapsed(start, end)).toBe(3);
    });

    it('should return 0 for same month', () => {
      const start = new Date('2024-03-15');
      const end = new Date('2024-03-20');

      expect(calculateMonthsElapsed(start, end)).toBe(0);
    });

    it('should handle multiple years', () => {
      const start = new Date('2020-01-01');
      const end = new Date('2024-01-01');

      expect(calculateMonthsElapsed(start, end)).toBe(48); // 4 years
    });
  });

  describe('isPeriodAlreadyProcessed', () => {
    it('should return false when no last depreciation date', () => {
      const result = isPeriodAlreadyProcessed(new Date('2024-03-31'), null);

      expect(result).toBe(false);
    });

    it('should return true when period already processed', () => {
      const result = isPeriodAlreadyProcessed(
        new Date('2024-03-31'),
        new Date('2024-03-15')
      );

      expect(result).toBe(true);
    });

    it('should return false when period is newer', () => {
      const result = isPeriodAlreadyProcessed(
        new Date('2024-04-30'),
        new Date('2024-03-15')
      );

      expect(result).toBe(false);
    });

    it('should compare by month, not exact date', () => {
      // Period end is March 31, last processed is March 1
      // Should be considered processed (same month)
      const result = isPeriodAlreadyProcessed(
        new Date('2024-03-31'),
        new Date('2024-03-01')
      );

      expect(result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle very short useful life (1 month)', () => {
      const shortLifeAsset: DepreciationInput = {
        acquisitionCost: 1000,
        salvageValue: 0,
        usefulLifeMonths: 1,
        depreciationStartDate: new Date('2024-01-01'),
        accumulatedDepreciation: 0,
      };
      const summary = calculateDepreciationSummary(shortLifeAsset);

      expect(summary.monthlyDepreciation).toBe(1000);
      expect(summary.annualDepreciation).toBe(12000);
    });

    it('should handle very long useful life (50 years)', () => {
      const longLifeAsset: DepreciationInput = {
        acquisitionCost: 600000,
        salvageValue: 0,
        usefulLifeMonths: 600,
        depreciationStartDate: new Date('2024-01-01'),
        accumulatedDepreciation: 0,
      };
      const summary = calculateDepreciationSummary(longLifeAsset);

      expect(summary.monthlyDepreciation).toBe(1000);
      expect(summary.remainingMonths).toBe(600);
    });

    it('should handle salvage value equal to cost', () => {
      const noDepreciationAsset: DepreciationInput = {
        acquisitionCost: 10000,
        salvageValue: 10000,
        usefulLifeMonths: 60,
        depreciationStartDate: new Date('2024-01-01'),
        accumulatedDepreciation: 0,
      };
      const result = calculateMonthlyDepreciation(noDepreciationAsset, new Date('2024-06-15'));

      expect(result).toBeNull(); // No depreciable amount
    });

    it('should handle leap year February correctly', () => {
      const leapYearAsset = {
        ...standardAsset,
        depreciationStartDate: new Date('2024-02-01'),
      };
      const result = calculateMonthlyDepreciation(leapYearAsset, new Date('2024-02-15'));

      expect(result).not.toBeNull();
      expect(result!.periodEnd.getDate()).toBe(29); // Leap year
    });

    it('should handle very small amounts without floating point errors', () => {
      const smallAsset: DepreciationInput = {
        acquisitionCost: 100,
        salvageValue: 10,
        usefulLifeMonths: 36,
        depreciationStartDate: new Date('2024-01-01'),
        accumulatedDepreciation: 0,
      };
      const summary = calculateDepreciationSummary(smallAsset);

      expect(summary.depreciableAmount).toBe(90);
      expect(summary.monthlyDepreciation).toBe(2.5);
    });
  });
});
