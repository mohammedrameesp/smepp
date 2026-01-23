/**
 * @file gratuity.ts
 * @description Qatar End of Service Benefits (Gratuity) calculation utilities
 * @module domains/hr/payroll
 */

import { GratuityCalculation, GratuityProjection } from '@/features/payroll/types/payroll';
import { calculateServiceMonths } from '@/features/leave/lib/leave-utils';
import { divideMoney, multiplyMoney, toFixed2 } from './utils';

/**
 * Qatar End of Service Benefits (Gratuity) Calculation
 *
 * Custom Formula: 3 weeks of BASIC salary per year of service (constant rate)
 * Pro-rated for partial years
 */

const WEEKS_PER_YEAR = 3; // 3 weeks per year of service

// Re-export for backwards compatibility
export { calculateServiceMonths };

/**
 * Calculate years of service
 */
export function calculateServiceYears(dateOfJoining: Date, referenceDate: Date = new Date()): number {
  const months = calculateServiceMonths(dateOfJoining, referenceDate);
  return months / 12;
}

/**
 * Minimum months of service required to be eligible for gratuity
 * FIN-006: Employee must complete 12 months to receive any gratuity
 */
const MINIMUM_MONTHS_FOR_GRATUITY = 12;

/**
 * Calculate gratuity based on basic salary and service duration
 *
 * Formula: 3 weeks of basic salary per year of service
 * - Weekly rate = (Basic Salary / 30) * 7
 * - Gratuity = Years of Service * 3 * Weekly Rate
 * - Pro-rated for partial years
 *
 * FIN-006: Minimum 12 months required for eligibility
 * - Less than 12 months = 0 gratuity
 * - 12+ months = gratuity for ALL months worked (including first 12)
 *
 * @param basicSalary Monthly basic salary in QAR
 * @param dateOfJoining Employee's date of joining
 * @param terminationDate Date of termination (defaults to today for projection)
 */
export function calculateGratuity(
  basicSalary: number,
  dateOfJoining: Date,
  terminationDate: Date = new Date()
): GratuityCalculation {
  // Calculate service duration
  const monthsOfService = calculateServiceMonths(dateOfJoining, terminationDate);
  const yearsOfService = Math.floor(monthsOfService / 12);
  const partialMonths = monthsOfService % 12;

  // Calculate days of service
  const daysOfService = Math.floor((monthsOfService / 12) * 365);

  // Daily and weekly rates based on basic salary
  // Monthly salary / 30 = daily rate
  // Daily rate * 7 = weekly rate
  // FIN-003: Use Decimal.js for precise financial calculations
  const dailyRate = divideMoney(basicSalary, 30);
  const weeklyRate = multiplyMoney(dailyRate, 7);

  // FIN-006: Check minimum eligibility (12 months)
  // Less than 12 months = no gratuity at all
  if (monthsOfService < MINIMUM_MONTHS_FOR_GRATUITY) {
    return {
      basicSalary,
      yearsOfService: 0,
      monthsOfService,
      daysOfService,
      weeksPerYear: WEEKS_PER_YEAR,
      gratuityAmount: 0,
      dailyRate: toFixed2(dailyRate),
      weeklyRate: toFixed2(weeklyRate),
      breakdown: {
        fullYearsAmount: 0,
        partialYearAmount: 0,
      },
      ineligible: true,
      ineligibleReason: `Minimum ${MINIMUM_MONTHS_FOR_GRATUITY} months of service required. Current: ${monthsOfService} months.`,
    };
  }

  // Full years gratuity: years * 3 weeks * weekly rate
  // FIN-003: Use Decimal.js for precise multiplication
  const fullYearsAmount = multiplyMoney(multiplyMoney(yearsOfService, WEEKS_PER_YEAR), weeklyRate);

  // Partial year gratuity: (months / 12) * 3 weeks * weekly rate
  const partialYearFraction = partialMonths / 12;
  const partialYearAmount = multiplyMoney(multiplyMoney(partialYearFraction, WEEKS_PER_YEAR), weeklyRate);

  const gratuityAmount = toFixed2(fullYearsAmount + partialYearAmount);

  return {
    basicSalary,
    yearsOfService,
    monthsOfService,
    daysOfService,
    weeksPerYear: WEEKS_PER_YEAR,
    gratuityAmount,
    dailyRate: toFixed2(dailyRate),
    weeklyRate: toFixed2(weeklyRate),
    breakdown: {
      fullYearsAmount: toFixed2(fullYearsAmount),
      partialYearAmount: toFixed2(partialYearAmount),
    },
  };
}

/**
 * Get projected gratuity at future dates
 */
export function projectGratuity(
  basicSalary: number,
  dateOfJoining: Date,
  projectionYears: number[] = [1, 3, 5, 10]
): GratuityProjection[] {
  const today = new Date();

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
}

/**
 * Format gratuity amount for display
 * Uses shared formatCurrency for consistency
 */
export { formatCurrency as formatGratuityAmount } from '@/lib/core/currency';

/**
 * Get service duration text
 */
export function getServiceDurationText(monthsOfService: number): string {
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
}
