/**
 * Asset Depreciation Calculator
 * Implements straight-line depreciation method following Qatar Tax Rates and IFRS standards
 *
 * Formula: (Cost - Salvage Value) / Useful Life in Months
 */

export interface DepreciationInput {
  acquisitionCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  depreciationStartDate: Date;
  accumulatedDepreciation: number;
}

export interface MonthlyDepreciationResult {
  monthlyAmount: number;
  periodStart: Date;
  periodEnd: Date;
  newAccumulatedAmount: number;
  newNetBookValue: number;
  isFullyDepreciated: boolean;
  proRataFactor: number; // 1.0 for full month, less for partial
}

export interface DepreciationSummary {
  acquisitionCost: number;
  salvageValue: number;
  depreciableAmount: number;
  usefulLifeMonths: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  remainingMonths: number;
  percentDepreciated: number;
  isFullyDepreciated: boolean;
}

/**
 * Round to 2 decimal places for currency
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Get the first day of a month
 */
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the last day of a month
 */
function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Calculate straight-line depreciation for a single month
 */
export function calculateMonthlyDepreciation(
  input: DepreciationInput,
  calculationDate: Date = new Date()
): MonthlyDepreciationResult | null {
  const {
    acquisitionCost,
    salvageValue,
    usefulLifeMonths,
    depreciationStartDate,
    accumulatedDepreciation,
  } = input;

  // Validate inputs
  if (acquisitionCost <= 0 || usefulLifeMonths <= 0) {
    return null;
  }

  // Depreciable amount
  const depreciableAmount = acquisitionCost - salvageValue;
  if (depreciableAmount <= 0) {
    return null;
  }

  // Monthly depreciation (straight-line)
  const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

  // Calculate period
  const periodStart = getMonthStart(calculationDate);
  const periodEnd = getMonthEnd(calculationDate);

  // Normalize depreciation start date to beginning of day
  const startDate = new Date(depreciationStartDate);
  startDate.setHours(0, 0, 0, 0);

  // Pro-rata for first month if asset acquired mid-month
  let proRataFactor = 1.0;
  if (startDate > periodStart && startDate <= periodEnd) {
    const daysInMonth = periodEnd.getDate();
    const daysRemaining = daysInMonth - startDate.getDate() + 1;
    proRataFactor = daysRemaining / daysInMonth;
  }

  // Check if depreciation should start yet
  if (startDate > periodEnd) {
    return null; // Not yet started
  }

  // Check remaining depreciable amount
  const remainingDepreciable = depreciableAmount - accumulatedDepreciation;
  if (remainingDepreciable <= 0) {
    return null; // Fully depreciated
  }

  // Calculate depreciation amount with pro-rata
  let depreciationAmount = monthlyDepreciation * proRataFactor;

  // Cap at remaining amount (don't depreciate below salvage value)
  depreciationAmount = Math.min(depreciationAmount, remainingDepreciable);

  const newAccumulatedAmount = accumulatedDepreciation + depreciationAmount;
  const newNetBookValue = acquisitionCost - newAccumulatedAmount;
  const isFullyDepreciated = newAccumulatedAmount >= depreciableAmount - 0.01; // Allow for rounding

  return {
    monthlyAmount: round2(depreciationAmount),
    periodStart,
    periodEnd,
    newAccumulatedAmount: round2(newAccumulatedAmount),
    newNetBookValue: round2(newNetBookValue),
    isFullyDepreciated,
    proRataFactor: round2(proRataFactor),
  };
}

/**
 * Generate full depreciation schedule for an asset (projected schedule)
 */
export function generateDepreciationSchedule(input: DepreciationInput): MonthlyDepreciationResult[] {
  const schedule: MonthlyDepreciationResult[] = [];
  let currentDate = new Date(input.depreciationStartDate);
  let accumulated = input.accumulatedDepreciation;

  // Safety limit - max 600 months (50 years)
  const maxIterations = 600;
  let iterations = 0;

  while (iterations < maxIterations) {
    const result = calculateMonthlyDepreciation(
      {
        ...input,
        accumulatedDepreciation: accumulated,
      },
      currentDate
    );

    if (!result) break;

    schedule.push(result);
    accumulated = result.newAccumulatedAmount;

    if (result.isFullyDepreciated) break;

    // Move to next month
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    iterations++;
  }

  return schedule;
}

/**
 * Calculate depreciation summary for an asset
 */
export function calculateDepreciationSummary(input: DepreciationInput): DepreciationSummary {
  const { acquisitionCost, salvageValue, usefulLifeMonths, accumulatedDepreciation } = input;

  const depreciableAmount = Math.max(0, acquisitionCost - salvageValue);
  const monthlyDepreciation = usefulLifeMonths > 0 ? depreciableAmount / usefulLifeMonths : 0;
  const annualDepreciation = monthlyDepreciation * 12;
  const netBookValue = acquisitionCost - accumulatedDepreciation;
  const remainingDepreciable = Math.max(0, depreciableAmount - accumulatedDepreciation);
  const remainingMonths =
    monthlyDepreciation > 0 ? Math.ceil(remainingDepreciable / monthlyDepreciation) : 0;
  const percentDepreciated =
    depreciableAmount > 0 ? (accumulatedDepreciation / depreciableAmount) * 100 : 0;
  const isFullyDepreciated = remainingDepreciable <= 0.01;

  return {
    acquisitionCost: round2(acquisitionCost),
    salvageValue: round2(salvageValue),
    depreciableAmount: round2(depreciableAmount),
    usefulLifeMonths,
    monthlyDepreciation: round2(monthlyDepreciation),
    annualDepreciation: round2(annualDepreciation),
    accumulatedDepreciation: round2(accumulatedDepreciation),
    netBookValue: round2(netBookValue),
    remainingMonths,
    percentDepreciated: round2(percentDepreciated),
    isFullyDepreciated,
  };
}

/**
 * Calculate how many months have passed since depreciation start
 */
export function calculateMonthsElapsed(startDate: Date, endDate: Date = new Date()): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();

  return years * 12 + months;
}

/**
 * Check if depreciation has already been recorded for a specific period
 */
export function isPeriodAlreadyProcessed(
  periodEnd: Date,
  lastDepreciationDate: Date | null
): boolean {
  if (!lastDepreciationDate) return false;

  const periodEndMonth = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
  const lastProcessedMonth = new Date(
    lastDepreciationDate.getFullYear(),
    lastDepreciationDate.getMonth(),
    1
  );

  return periodEndMonth <= lastProcessedMonth;
}
