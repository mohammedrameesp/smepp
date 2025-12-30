/**
 * Tests for Asset Depreciation Calculator
 * @see src/lib/domains/operations/assets/depreciation/calculator.ts
 */

import {
  calculateMonthlyDepreciation,
  generateDepreciationSchedule,
  calculateDepreciationSummary,
  calculateMonthsElapsed,
  isPeriodAlreadyProcessed,
  DepreciationInput,
} from '@/lib/domains/operations/assets/depreciation/calculator';

describe('Asset Depreciation Calculator', () => {
  // Helper to create a date at start of month
  const monthStart = (year: number, month: number): Date => {
    return new Date(year, month - 1, 1); // month is 0-indexed in JS
  };

  // Helper to create a date at specific day
  const createDate = (year: number, month: number, day: number): Date => {
    return new Date(year, month - 1, day);
  };

  // Standard test input for a computer (IT Equipment category)
  const standardInput: DepreciationInput = {
    acquisitionCost: 10000,
    salvageValue: 0,
    usefulLifeMonths: 60, // 5 years
    depreciationStartDate: monthStart(2024, 1), // Jan 2024
    accumulatedDepreciation: 0,
  };

  describe('calculateMonthlyDepreciation', () => {
    describe('Basic calculations', () => {
      it('should calculate correct monthly depreciation for standard input', () => {
        const result = calculateMonthlyDepreciation(standardInput, monthStart(2024, 1));

        expect(result).not.toBeNull();
        expect(result!.monthlyAmount).toBe(166.67); // 10000 / 60 = 166.67
        expect(result!.newAccumulatedAmount).toBe(166.67);
        expect(result!.newNetBookValue).toBe(9833.33);
        expect(result!.isFullyDepreciated).toBe(false);
        expect(result!.proRataFactor).toBe(1);
      });

      it('should calculate with salvage value', () => {
        const inputWithSalvage: DepreciationInput = {
          ...standardInput,
          salvageValue: 1000,
        };
        const result = calculateMonthlyDepreciation(inputWithSalvage, monthStart(2024, 1));

        expect(result).not.toBeNull();
        // (10000 - 1000) / 60 = 150
        expect(result!.monthlyAmount).toBe(150);
        expect(result!.newNetBookValue).toBe(9850);
      });

      it('should handle accumulated depreciation', () => {
        const inputWithAccumulated: DepreciationInput = {
          ...standardInput,
          accumulatedDepreciation: 1000,
        };
        const result = calculateMonthlyDepreciation(inputWithAccumulated, monthStart(2024, 2));

        expect(result).not.toBeNull();
        expect(result!.monthlyAmount).toBe(166.67);
        expect(result!.newAccumulatedAmount).toBe(1166.67);
        expect(result!.newNetBookValue).toBe(8833.33);
      });
    });

    describe('Pro-rata calculations', () => {
      it('should apply pro-rata for mid-month start', () => {
        const inputMidMonth: DepreciationInput = {
          ...standardInput,
          depreciationStartDate: createDate(2024, 1, 15), // Jan 15
        };
        const result = calculateMonthlyDepreciation(inputMidMonth, monthStart(2024, 1));

        expect(result).not.toBeNull();
        // Jan has 31 days, 15th means 17 days remaining (15-31 inclusive)
        // Pro-rata factor = 17/31 ≈ 0.55
        expect(result!.proRataFactor).toBeCloseTo(0.55, 1);
        // Monthly amount should be prorated
        expect(result!.monthlyAmount).toBeLessThan(166.67);
      });

      it('should apply full month after first pro-rata month', () => {
        const inputMidMonth: DepreciationInput = {
          ...standardInput,
          depreciationStartDate: createDate(2024, 1, 15),
        };
        const result = calculateMonthlyDepreciation(inputMidMonth, monthStart(2024, 2));

        expect(result).not.toBeNull();
        expect(result!.proRataFactor).toBe(1);
        expect(result!.monthlyAmount).toBe(166.67);
      });

      it('should calculate pro-rata for last day of month start', () => {
        const inputEndMonth: DepreciationInput = {
          ...standardInput,
          depreciationStartDate: createDate(2024, 1, 31), // Jan 31
        };
        const result = calculateMonthlyDepreciation(inputEndMonth, monthStart(2024, 1));

        expect(result).not.toBeNull();
        // Only 1 day remaining in month
        expect(result!.proRataFactor).toBeCloseTo(1 / 31, 2);
      });
    });

    describe('Edge cases', () => {
      it('should return null for zero acquisition cost', () => {
        const zeroInput: DepreciationInput = {
          ...standardInput,
          acquisitionCost: 0,
        };
        const result = calculateMonthlyDepreciation(zeroInput, monthStart(2024, 1));
        expect(result).toBeNull();
      });

      it('should return null for negative acquisition cost', () => {
        const negativeInput: DepreciationInput = {
          ...standardInput,
          acquisitionCost: -1000,
        };
        const result = calculateMonthlyDepreciation(negativeInput, monthStart(2024, 1));
        expect(result).toBeNull();
      });

      it('should return null for zero useful life', () => {
        const zeroLifeInput: DepreciationInput = {
          ...standardInput,
          usefulLifeMonths: 0,
        };
        const result = calculateMonthlyDepreciation(zeroLifeInput, monthStart(2024, 1));
        expect(result).toBeNull();
      });

      it('should return null when salvage value equals acquisition cost', () => {
        const equalSalvageInput: DepreciationInput = {
          ...standardInput,
          salvageValue: 10000,
        };
        const result = calculateMonthlyDepreciation(equalSalvageInput, monthStart(2024, 1));
        expect(result).toBeNull();
      });

      it('should return null when salvage value exceeds acquisition cost', () => {
        const highSalvageInput: DepreciationInput = {
          ...standardInput,
          salvageValue: 15000,
        };
        const result = calculateMonthlyDepreciation(highSalvageInput, monthStart(2024, 1));
        expect(result).toBeNull();
      });

      it('should return null when calculation date is before start date', () => {
        const result = calculateMonthlyDepreciation(standardInput, monthStart(2023, 12));
        expect(result).toBeNull();
      });

      it('should return null when fully depreciated', () => {
        const fullyDepreciatedInput: DepreciationInput = {
          ...standardInput,
          accumulatedDepreciation: 10000,
        };
        const result = calculateMonthlyDepreciation(fullyDepreciatedInput, monthStart(2024, 6));
        expect(result).toBeNull();
      });
    });

    describe('Final period handling', () => {
      it('should cap final depreciation at remaining amount', () => {
        const nearlyDoneInput: DepreciationInput = {
          ...standardInput,
          accumulatedDepreciation: 9900, // Only 100 remaining
        };
        const result = calculateMonthlyDepreciation(nearlyDoneInput, monthStart(2028, 12));

        expect(result).not.toBeNull();
        expect(result!.monthlyAmount).toBe(100); // Capped at remaining
        expect(result!.newAccumulatedAmount).toBe(10000);
        expect(result!.newNetBookValue).toBe(0);
        expect(result!.isFullyDepreciated).toBe(true);
      });

      it('should mark as fully depreciated when remaining is negligible', () => {
        const almostDoneInput: DepreciationInput = {
          ...standardInput,
          accumulatedDepreciation: 9999.99,
        };
        const result = calculateMonthlyDepreciation(almostDoneInput, monthStart(2028, 12));

        expect(result).not.toBeNull();
        expect(result!.isFullyDepreciated).toBe(true);
      });
    });

    describe('Period boundaries', () => {
      it('should set correct period start and end', () => {
        const result = calculateMonthlyDepreciation(standardInput, createDate(2024, 3, 15));

        expect(result).not.toBeNull();
        expect(result!.periodStart.getMonth()).toBe(2); // March (0-indexed)
        expect(result!.periodStart.getDate()).toBe(1);
        expect(result!.periodEnd.getMonth()).toBe(2);
        expect(result!.periodEnd.getDate()).toBe(31); // March has 31 days
      });

      it('should handle February correctly', () => {
        const result = calculateMonthlyDepreciation(standardInput, createDate(2024, 2, 15));

        expect(result).not.toBeNull();
        expect(result!.periodEnd.getDate()).toBe(29); // 2024 is a leap year
      });

      it('should handle February in non-leap year', () => {
        const inputIn2025: DepreciationInput = {
          ...standardInput,
          depreciationStartDate: monthStart(2025, 1),
        };
        const result = calculateMonthlyDepreciation(inputIn2025, createDate(2025, 2, 15));

        expect(result).not.toBeNull();
        expect(result!.periodEnd.getDate()).toBe(28);
      });
    });
  });

  describe('generateDepreciationSchedule', () => {
    it('should generate full schedule for 5-year asset', () => {
      const schedule = generateDepreciationSchedule(standardInput);

      expect(schedule.length).toBe(60); // 5 years * 12 months
      expect(schedule[0].monthlyAmount).toBe(166.67);
      expect(schedule[schedule.length - 1].isFullyDepreciated).toBe(true);
    });

    it('should generate schedule for building (25 years)', () => {
      const buildingInput: DepreciationInput = {
        acquisitionCost: 1000000,
        salvageValue: 0,
        usefulLifeMonths: 300, // 25 years
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 0,
      };
      const schedule = generateDepreciationSchedule(buildingInput);

      // Schedule may have 300 or 301 entries depending on rounding
      expect(schedule.length).toBeGreaterThanOrEqual(300);
      expect(schedule.length).toBeLessThanOrEqual(301);
      // Monthly = 1000000 / 300 = 3333.33
      expect(schedule[0].monthlyAmount).toBe(3333.33);
    });

    it('should start from existing accumulated depreciation', () => {
      const partialInput: DepreciationInput = {
        ...standardInput,
        accumulatedDepreciation: 5000, // Half depreciated
      };
      const schedule = generateDepreciationSchedule(partialInput);

      // Should only need 30 more periods
      expect(schedule.length).toBe(30);
      expect(schedule[0].newAccumulatedAmount).toBeCloseTo(5166.67, 1);
    });

    it('should return empty schedule for fully depreciated asset', () => {
      const fullInput: DepreciationInput = {
        ...standardInput,
        accumulatedDepreciation: 10000,
      };
      const schedule = generateDepreciationSchedule(fullInput);

      expect(schedule.length).toBe(0);
    });

    it('should handle pro-rata first month in schedule', () => {
      const midMonthInput: DepreciationInput = {
        ...standardInput,
        depreciationStartDate: createDate(2024, 1, 15),
      };
      const schedule = generateDepreciationSchedule(midMonthInput);

      // First month should be pro-rated
      expect(schedule[0].proRataFactor).toBeLessThan(1);
      // Second month should be full
      expect(schedule[1].proRataFactor).toBe(1);
    });

    it('should respect safety limit of 600 months', () => {
      const veryLongInput: DepreciationInput = {
        acquisitionCost: 1000000,
        salvageValue: 0,
        usefulLifeMonths: 1200, // 100 years - unrealistic
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 0,
      };
      const schedule = generateDepreciationSchedule(veryLongInput);

      expect(schedule.length).toBeLessThanOrEqual(600);
    });

    it('should accumulate correctly through schedule', () => {
      const schedule = generateDepreciationSchedule(standardInput);

      // Check accumulation is correct at various points
      expect(schedule[11].newAccumulatedAmount).toBeCloseTo(2000.04, 1); // After 1 year
      expect(schedule[23].newAccumulatedAmount).toBeCloseTo(4000.08, 1); // After 2 years
      expect(schedule[59].newAccumulatedAmount).toBe(10000); // Final
      expect(schedule[59].newNetBookValue).toBe(0);
    });
  });

  describe('calculateDepreciationSummary', () => {
    it('should calculate correct summary for standard input', () => {
      const summary = calculateDepreciationSummary(standardInput);

      expect(summary.acquisitionCost).toBe(10000);
      expect(summary.salvageValue).toBe(0);
      expect(summary.depreciableAmount).toBe(10000);
      expect(summary.usefulLifeMonths).toBe(60);
      expect(summary.monthlyDepreciation).toBe(166.67);
      // 166.67 * 12 = 2000.04, but rounding in calculator gives 2000
      expect(summary.annualDepreciation).toBeCloseTo(2000, 0);
      expect(summary.accumulatedDepreciation).toBe(0);
      expect(summary.netBookValue).toBe(10000);
      expect(summary.remainingMonths).toBe(60);
      expect(summary.percentDepreciated).toBe(0);
      expect(summary.isFullyDepreciated).toBe(false);
    });

    it('should calculate summary with partial depreciation', () => {
      const partialInput: DepreciationInput = {
        ...standardInput,
        accumulatedDepreciation: 5000,
      };
      const summary = calculateDepreciationSummary(partialInput);

      expect(summary.accumulatedDepreciation).toBe(5000);
      expect(summary.netBookValue).toBe(5000);
      expect(summary.remainingMonths).toBe(30);
      expect(summary.percentDepreciated).toBe(50);
      expect(summary.isFullyDepreciated).toBe(false);
    });

    it('should calculate summary for fully depreciated asset', () => {
      const fullInput: DepreciationInput = {
        ...standardInput,
        accumulatedDepreciation: 10000,
      };
      const summary = calculateDepreciationSummary(fullInput);

      expect(summary.accumulatedDepreciation).toBe(10000);
      expect(summary.netBookValue).toBe(0);
      expect(summary.remainingMonths).toBe(0);
      expect(summary.percentDepreciated).toBe(100);
      expect(summary.isFullyDepreciated).toBe(true);
    });

    it('should handle salvage value correctly', () => {
      const salvageInput: DepreciationInput = {
        ...standardInput,
        salvageValue: 2000,
        accumulatedDepreciation: 4000,
      };
      const summary = calculateDepreciationSummary(salvageInput);

      expect(summary.depreciableAmount).toBe(8000);
      expect(summary.monthlyDepreciation).toBe(133.33);
      expect(summary.percentDepreciated).toBe(50); // 4000/8000 = 50%
    });

    it('should handle zero useful life gracefully', () => {
      const zeroLifeInput: DepreciationInput = {
        ...standardInput,
        usefulLifeMonths: 0,
      };
      const summary = calculateDepreciationSummary(zeroLifeInput);

      expect(summary.monthlyDepreciation).toBe(0);
      expect(summary.annualDepreciation).toBe(0);
      expect(summary.remainingMonths).toBe(0);
    });
  });

  describe('calculateMonthsElapsed', () => {
    it('should calculate months between same dates', () => {
      const date = monthStart(2024, 6);
      expect(calculateMonthsElapsed(date, date)).toBe(0);
    });

    it('should calculate months within same year', () => {
      const start = monthStart(2024, 1);
      const end = monthStart(2024, 6);
      expect(calculateMonthsElapsed(start, end)).toBe(5);
    });

    it('should calculate months across years', () => {
      const start = monthStart(2024, 1);
      const end = monthStart(2025, 6);
      expect(calculateMonthsElapsed(start, end)).toBe(17);
    });

    it('should handle negative result for future start date', () => {
      const start = monthStart(2025, 6);
      const end = monthStart(2024, 1);
      expect(calculateMonthsElapsed(start, end)).toBe(-17);
    });

    it('should calculate full years correctly', () => {
      const start = monthStart(2020, 1);
      const end = monthStart(2025, 1);
      expect(calculateMonthsElapsed(start, end)).toBe(60);
    });
  });

  describe('isPeriodAlreadyProcessed', () => {
    it('should return false when no previous depreciation', () => {
      const periodEnd = monthStart(2024, 6);
      expect(isPeriodAlreadyProcessed(periodEnd, null)).toBe(false);
    });

    it('should return true when period already processed', () => {
      const periodEnd = monthStart(2024, 6);
      const lastProcessed = createDate(2024, 6, 30); // Same month
      expect(isPeriodAlreadyProcessed(periodEnd, lastProcessed)).toBe(true);
    });

    it('should return false for new period', () => {
      const periodEnd = monthStart(2024, 7);
      const lastProcessed = createDate(2024, 6, 30);
      expect(isPeriodAlreadyProcessed(periodEnd, lastProcessed)).toBe(false);
    });

    it('should return true for earlier period', () => {
      const periodEnd = monthStart(2024, 5);
      const lastProcessed = createDate(2024, 6, 30);
      expect(isPeriodAlreadyProcessed(periodEnd, lastProcessed)).toBe(true);
    });

    it('should compare only month and year', () => {
      const periodEnd = createDate(2024, 6, 15);
      const lastProcessed = createDate(2024, 6, 1);
      expect(isPeriodAlreadyProcessed(periodEnd, lastProcessed)).toBe(true);
    });
  });

  describe('Qatar Tax Rate Integration Tests', () => {
    it('should correctly calculate for Buildings (4%, 25 years)', () => {
      const buildingInput: DepreciationInput = {
        acquisitionCost: 5000000, // 5M QAR building
        salvageValue: 0,
        usefulLifeMonths: 300, // 25 years
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 0,
      };

      const summary = calculateDepreciationSummary(buildingInput);
      const schedule = generateDepreciationSchedule(buildingInput);

      // Annual rate should be approximately 4%
      const effectiveAnnualRate = (summary.annualDepreciation / summary.acquisitionCost) * 100;
      expect(effectiveAnnualRate).toBeCloseTo(4, 0);

      // Schedule should complete in 300 months
      expect(schedule.length).toBe(300);
      expect(schedule[schedule.length - 1].newNetBookValue).toBe(0);
    });

    it('should correctly calculate for IT Equipment (20%, 5 years)', () => {
      const itInput: DepreciationInput = {
        acquisitionCost: 50000, // Laptop
        salvageValue: 0,
        usefulLifeMonths: 60,
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 0,
      };

      const summary = calculateDepreciationSummary(itInput);
      const schedule = generateDepreciationSchedule(itInput);

      // Annual rate should be 20%
      const effectiveAnnualRate = (summary.annualDepreciation / summary.acquisitionCost) * 100;
      expect(effectiveAnnualRate).toBeCloseTo(20, 0);

      // Schedule should complete in approximately 60 months (may have 1 extra for rounding)
      expect(schedule.length).toBeGreaterThanOrEqual(60);
      expect(schedule.length).toBeLessThanOrEqual(61);
    });

    it('should correctly calculate for Vehicles (20%, 5 years)', () => {
      const vehicleInput: DepreciationInput = {
        acquisitionCost: 150000, // Company car
        salvageValue: 30000, // 20% salvage value
        usefulLifeMonths: 60,
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 0,
      };

      const summary = calculateDepreciationSummary(vehicleInput);

      // Depreciable amount should be 120000
      expect(summary.depreciableAmount).toBe(120000);
      // Monthly should be 120000/60 = 2000
      expect(summary.monthlyDepreciation).toBe(2000);
      // Annual = 24000
      expect(summary.annualDepreciation).toBe(24000);
    });

    it('should correctly calculate for Furniture (20%, 5 years) with mid-year start', () => {
      const furnitureInput: DepreciationInput = {
        acquisitionCost: 25000,
        salvageValue: 0,
        usefulLifeMonths: 60,
        depreciationStartDate: createDate(2024, 7, 15), // Mid-July
        accumulatedDepreciation: 0,
      };

      const schedule = generateDepreciationSchedule(furnitureInput);

      // First month should be pro-rated
      expect(schedule[0].proRataFactor).toBeLessThan(1);

      // Remaining months should be full
      for (let i = 1; i < schedule.length; i++) {
        if (!schedule[i].isFullyDepreciated) {
          expect(schedule[i].proRataFactor).toBe(1);
        }
      }
    });
  });

  describe('IFRS Compliance Tests', () => {
    it('should not depreciate below salvage value', () => {
      const salvageInput: DepreciationInput = {
        acquisitionCost: 10000,
        salvageValue: 2000,
        usefulLifeMonths: 60,
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 0,
      };

      const schedule = generateDepreciationSchedule(salvageInput);
      const lastEntry = schedule[schedule.length - 1];

      // Final NBV should equal salvage value
      expect(lastEntry.newNetBookValue).toBe(2000);
      // Accumulated should be cost - salvage
      expect(lastEntry.newAccumulatedAmount).toBe(8000);
    });

    it('should use consistent straight-line method', () => {
      const schedule = generateDepreciationSchedule(standardInput);

      // All full months should have same depreciation (except pro-rata and final)
      const fullMonthAmounts = schedule.slice(0, -1).filter((s) => s.proRataFactor === 1);

      const firstAmount = fullMonthAmounts[0].monthlyAmount;
      fullMonthAmounts.forEach((entry) => {
        expect(entry.monthlyAmount).toBe(firstAmount);
      });
    });

    it('should handle acquisition cost changes (impairment scenario)', () => {
      // Simulate asset impairment - reduced cost basis
      const impairedInput: DepreciationInput = {
        acquisitionCost: 8000, // Reduced from 10000
        salvageValue: 0,
        usefulLifeMonths: 60,
        depreciationStartDate: monthStart(2024, 1),
        accumulatedDepreciation: 2000, // Already depreciated
      };

      const summary = calculateDepreciationSummary(impairedInput);

      // Net book value should reflect impairment
      expect(summary.netBookValue).toBe(6000);
      // Remaining months calculated based on original useful life and monthly amount
      // Monthly = 8000/60 = 133.33, remaining = 6000, months = 6000/133.33 = 45
      expect(summary.remainingMonths).toBe(45);
    });
  });
});
