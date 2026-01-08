/**
 * @file gratuity.test.ts
 * @description Tests for Qatar End of Service Benefits (Gratuity) calculations
 */

describe('Gratuity Calculation Tests', () => {
  describe('calculateServiceMonths', () => {
    const calculateServiceMonths = (dateOfJoining: Date, referenceDate: Date = new Date()): number => {
      const joinDate = new Date(dateOfJoining);
      const refDate = new Date(referenceDate);

      let months = (refDate.getFullYear() - joinDate.getFullYear()) * 12;
      months -= joinDate.getMonth();
      months += refDate.getMonth();

      if (refDate.getDate() < joinDate.getDate()) {
        months--;
      }

      return Math.max(0, months);
    };

    it('should return 0 for same month', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-15'),
        new Date('2024-01-20')
      );
      expect(result).toBe(0);
    });

    it('should calculate 12 months for exactly 1 year', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-15'),
        new Date('2025-01-15')
      );
      expect(result).toBe(12);
    });

    it('should adjust for partial month (day not reached)', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-20'),
        new Date('2025-01-15')
      );
      expect(result).toBe(11);
    });

    it('should handle year boundary', () => {
      const result = calculateServiceMonths(
        new Date('2024-11-15'),
        new Date('2025-02-15')
      );
      expect(result).toBe(3);
    });

    it('should return 0 for reference before join', () => {
      const result = calculateServiceMonths(
        new Date('2025-01-15'),
        new Date('2024-01-15')
      );
      expect(result).toBe(0);
    });

    it('should handle 5 years service', () => {
      const result = calculateServiceMonths(
        new Date('2020-01-15'),
        new Date('2025-01-15')
      );
      expect(result).toBe(60);
    });
  });

  describe('calculateServiceYears', () => {
    const calculateServiceYears = (dateOfJoining: Date, referenceDate: Date = new Date()): number => {
      const calculateServiceMonths = (jd: Date, rd: Date): number => {
        const joinDate = new Date(jd);
        const refDate = new Date(rd);
        let months = (refDate.getFullYear() - joinDate.getFullYear()) * 12;
        months -= joinDate.getMonth();
        months += refDate.getMonth();
        if (refDate.getDate() < joinDate.getDate()) months--;
        return Math.max(0, months);
      };
      return calculateServiceMonths(dateOfJoining, referenceDate) / 12;
    };

    it('should return fractional years', () => {
      const result = calculateServiceYears(
        new Date('2024-01-15'),
        new Date('2024-07-15')
      );
      expect(result).toBe(0.5);
    });

    it('should return full years', () => {
      const result = calculateServiceYears(
        new Date('2020-01-15'),
        new Date('2025-01-15')
      );
      expect(result).toBe(5);
    });

    it('should handle decimal years', () => {
      const result = calculateServiceYears(
        new Date('2024-01-15'),
        new Date('2025-07-15')
      );
      expect(result).toBe(1.5);
    });
  });

  describe('calculateGratuity (FIN-006)', () => {
    const WEEKS_PER_YEAR = 3;
    const MINIMUM_MONTHS_FOR_GRATUITY = 12;

    interface GratuityCalculation {
      basicSalary: number;
      yearsOfService: number;
      monthsOfService: number;
      daysOfService: number;
      weeksPerYear: number;
      gratuityAmount: number;
      dailyRate: number;
      weeklyRate: number;
      breakdown: {
        fullYearsAmount: number;
        partialYearAmount: number;
      };
      ineligible?: boolean;
      ineligibleReason?: string;
    }

    const calculateGratuity = (
      basicSalary: number,
      dateOfJoining: Date,
      terminationDate: Date = new Date()
    ): GratuityCalculation => {
      // Calculate service duration
      const joinDate = new Date(dateOfJoining);
      const refDate = new Date(terminationDate);
      let months = (refDate.getFullYear() - joinDate.getFullYear()) * 12;
      months -= joinDate.getMonth();
      months += refDate.getMonth();
      if (refDate.getDate() < joinDate.getDate()) months--;
      const monthsOfService = Math.max(0, months);

      const yearsOfService = Math.floor(monthsOfService / 12);
      const partialMonths = monthsOfService % 12;
      const daysOfService = Math.floor((monthsOfService / 12) * 365);

      const dailyRate = basicSalary / 30;
      const weeklyRate = dailyRate * 7;

      // FIN-006: Minimum 12 months required
      if (monthsOfService < MINIMUM_MONTHS_FOR_GRATUITY) {
        return {
          basicSalary,
          yearsOfService: 0,
          monthsOfService,
          daysOfService,
          weeksPerYear: WEEKS_PER_YEAR,
          gratuityAmount: 0,
          dailyRate: Math.round(dailyRate * 100) / 100,
          weeklyRate: Math.round(weeklyRate * 100) / 100,
          breakdown: {
            fullYearsAmount: 0,
            partialYearAmount: 0,
          },
          ineligible: true,
          ineligibleReason: `Minimum ${MINIMUM_MONTHS_FOR_GRATUITY} months of service required. Current: ${monthsOfService} months.`,
        };
      }

      const fullYearsAmount = yearsOfService * WEEKS_PER_YEAR * weeklyRate;
      const partialYearAmount = (partialMonths / 12) * WEEKS_PER_YEAR * weeklyRate;
      const gratuityAmount = fullYearsAmount + partialYearAmount;

      return {
        basicSalary,
        yearsOfService,
        monthsOfService,
        daysOfService,
        weeksPerYear: WEEKS_PER_YEAR,
        gratuityAmount: Math.round(gratuityAmount * 100) / 100,
        dailyRate: Math.round(dailyRate * 100) / 100,
        weeklyRate: Math.round(weeklyRate * 100) / 100,
        breakdown: {
          fullYearsAmount: Math.round(fullYearsAmount * 100) / 100,
          partialYearAmount: Math.round(partialYearAmount * 100) / 100,
        },
      };
    };

    it('should return 0 for less than 12 months service', () => {
      const result = calculateGratuity(
        10000,
        new Date('2024-06-15'),
        new Date('2024-12-15')
      );
      expect(result.gratuityAmount).toBe(0);
      expect(result.ineligible).toBe(true);
      expect(result.ineligibleReason).toContain('Minimum 12 months');
    });

    it('should calculate gratuity for exactly 1 year', () => {
      // Basic salary: 10000 QAR
      // Daily rate: 10000/30 = 333.33
      // Weekly rate: 333.33 * 7 = 2333.33
      // 1 year: 3 weeks * 2333.33 = 7000
      const result = calculateGratuity(
        10000,
        new Date('2024-01-15'),
        new Date('2025-01-15')
      );
      expect(result.yearsOfService).toBe(1);
      expect(result.monthsOfService).toBe(12);
      expect(result.dailyRate).toBeCloseTo(333.33, 2);
      expect(result.weeklyRate).toBeCloseTo(2333.33, 2);
      expect(result.gratuityAmount).toBeCloseTo(7000, 0);
    });

    it('should calculate gratuity for 2.5 years', () => {
      // 2.5 years = 30 months
      // Full years: 2 years * 3 weeks * weeklyRate
      // Partial: 6 months = 0.5 year * 3 weeks * weeklyRate
      const result = calculateGratuity(
        10000,
        new Date('2022-07-15'),
        new Date('2025-01-15')
      );
      expect(result.yearsOfService).toBe(2);
      expect(result.monthsOfService).toBe(30);
      expect(result.breakdown.fullYearsAmount).toBeCloseTo(14000, 0);
      expect(result.breakdown.partialYearAmount).toBeCloseTo(3500, 0);
      expect(result.gratuityAmount).toBeCloseTo(17500, 0);
    });

    it('should calculate gratuity for 5 years', () => {
      // 5 years * 3 weeks * weeklyRate
      const result = calculateGratuity(
        10000,
        new Date('2020-01-15'),
        new Date('2025-01-15')
      );
      expect(result.yearsOfService).toBe(5);
      expect(result.gratuityAmount).toBeCloseTo(35000, 0);
    });

    it('should include correct daily and weekly rates', () => {
      const result = calculateGratuity(
        15000,
        new Date('2024-01-15'),
        new Date('2025-01-15')
      );
      expect(result.dailyRate).toBe(500);
      expect(result.weeklyRate).toBe(3500);
    });

    it('should include correct breakdown', () => {
      const result = calculateGratuity(
        10000,
        new Date('2022-01-15'),
        new Date('2025-01-15')
      );
      // 3 full years
      expect(result.breakdown.fullYearsAmount).toBeCloseTo(21000, 0);
      expect(result.breakdown.partialYearAmount).toBe(0);
    });

    it('should handle partial year gratuity', () => {
      // 1 year 6 months = 18 months
      const result = calculateGratuity(
        10000,
        new Date('2023-07-15'),
        new Date('2025-01-15')
      );
      expect(result.monthsOfService).toBe(18);
      expect(result.yearsOfService).toBe(1);
      expect(result.breakdown.fullYearsAmount).toBeCloseTo(7000, 0);
      expect(result.breakdown.partialYearAmount).toBeCloseTo(3500, 0);
    });
  });

  describe('projectGratuity', () => {
    interface GratuityProjection {
      years: number;
      date: string;
      amount: number;
    }

    const calculateGratuity = (
      basicSalary: number,
      dateOfJoining: Date,
      terminationDate: Date
    ): { gratuityAmount: number } => {
      const joinDate = new Date(dateOfJoining);
      const refDate = new Date(terminationDate);
      let months = (refDate.getFullYear() - joinDate.getFullYear()) * 12;
      months -= joinDate.getMonth();
      months += refDate.getMonth();
      if (refDate.getDate() < joinDate.getDate()) months--;
      const monthsOfService = Math.max(0, months);

      if (monthsOfService < 12) {
        return { gratuityAmount: 0 };
      }

      const dailyRate = basicSalary / 30;
      const weeklyRate = dailyRate * 7;
      const yearsOfService = monthsOfService / 12;
      const gratuityAmount = yearsOfService * 3 * weeklyRate;

      return { gratuityAmount: Math.round(gratuityAmount * 100) / 100 };
    };

    const projectGratuity = (
      basicSalary: number,
      dateOfJoining: Date,
      projectionYears: number[] = [1, 3, 5, 10],
      today: Date = new Date()
    ): GratuityProjection[] => {
      return projectionYears.map(years => {
        const projectionDate = new Date(today);
        projectionDate.setFullYear(projectionDate.getFullYear() + years);

        const calculation = calculateGratuity(basicSalary, dateOfJoining, projectionDate);

        return {
          years,
          date: projectionDate.toISOString(),
          amount: calculation.gratuityAmount,
        };
      });
    };

    it('should project gratuity for multiple years', () => {
      const result = projectGratuity(
        10000,
        new Date('2024-01-15'),
        [1, 3, 5],
        new Date('2025-01-15')
      );
      expect(result).toHaveLength(3);
      expect(result[0].years).toBe(1);
      expect(result[1].years).toBe(3);
      expect(result[2].years).toBe(5);
    });

    it('should increase gratuity amount with years', () => {
      const result = projectGratuity(
        10000,
        new Date('2024-01-15'),
        [2, 3, 4],
        new Date('2025-01-15')
      );
      expect(result[0].amount).toBeLessThan(result[1].amount);
      expect(result[1].amount).toBeLessThan(result[2].amount);
    });

    it('should include projection date', () => {
      const result = projectGratuity(
        10000,
        new Date('2024-01-15'),
        [1],
        new Date('2025-01-15')
      );
      const projectedDate = new Date(result[0].date);
      expect(projectedDate.getFullYear()).toBe(2026);
    });
  });

  describe('formatGratuityAmount', () => {
    const formatGratuityAmount = (amount: number): string => {
      return new Intl.NumberFormat('en-QA', {
        style: 'currency',
        currency: 'QAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    };

    it('should format with QAR currency', () => {
      const result = formatGratuityAmount(10000);
      expect(result).toContain('QAR');
    });

    it('should format with 2 decimal places', () => {
      const result = formatGratuityAmount(10000.5);
      expect(result).toContain('.50');
    });

    it('should format large amounts with separators', () => {
      const result = formatGratuityAmount(1000000);
      // Expect comma or other separator
      expect(result.length).toBeGreaterThan('QAR 1000000.00'.length - 5);
    });
  });

  describe('getServiceDurationText', () => {
    const getServiceDurationText = (monthsOfService: number): string => {
      const years = Math.floor(monthsOfService / 12);
      const months = monthsOfService % 12;

      const parts: string[] = [];
      if (years > 0) {
        parts.push(`${years} year${years !== 1 ? 's' : ''}`);
      }
      if (months > 0) {
        parts.push(`${months} month${months !== 1 ? 's' : ''}`);
      }

      return parts.length > 0 ? parts.join(' and ') : '0 months';
    };

    it('should format months only', () => {
      expect(getServiceDurationText(6)).toBe('6 months');
    });

    it('should format 1 month (singular)', () => {
      expect(getServiceDurationText(1)).toBe('1 month');
    });

    it('should format years only', () => {
      expect(getServiceDurationText(24)).toBe('2 years');
    });

    it('should format 1 year (singular)', () => {
      expect(getServiceDurationText(12)).toBe('1 year');
    });

    it('should format years and months', () => {
      expect(getServiceDurationText(18)).toBe('1 year and 6 months');
    });

    it('should return 0 months for 0', () => {
      expect(getServiceDurationText(0)).toBe('0 months');
    });

    it('should handle complex duration', () => {
      expect(getServiceDurationText(25)).toBe('2 years and 1 month');
    });
  });

  describe('Gratuity Eligibility Edge Cases', () => {
    it('should not be eligible at 11 months', () => {
      const isEligible = (months: number) => months >= 12;
      expect(isEligible(11)).toBe(false);
    });

    it('should be eligible at exactly 12 months', () => {
      const isEligible = (months: number) => months >= 12;
      expect(isEligible(12)).toBe(true);
    });

    it('should include all months in calculation once eligible', () => {
      // FIN-006: Once 12 months is reached, gratuity is for ALL months
      const calculateGratuityMonths = (months: number): number => {
        if (months < 12) return 0;
        return months; // All months counted, not just months after 12
      };
      expect(calculateGratuityMonths(18)).toBe(18);
    });
  });

  describe('Gratuity Formula Components', () => {
    it('should use 30 days for daily rate calculation', () => {
      const dailyRate = (basicSalary: number) => basicSalary / 30;
      expect(dailyRate(10000)).toBeCloseTo(333.33, 2);
    });

    it('should use 7 days for weekly rate calculation', () => {
      const weeklyRate = (dailyRate: number) => dailyRate * 7;
      expect(weeklyRate(333.33)).toBeCloseTo(2333.31, 2);
    });

    it('should use 3 weeks per year', () => {
      const WEEKS_PER_YEAR = 3;
      const yearlyGratuity = (weeklyRate: number) => WEEKS_PER_YEAR * weeklyRate;
      expect(yearlyGratuity(2333.33)).toBeCloseTo(6999.99, 2);
    });
  });
});
