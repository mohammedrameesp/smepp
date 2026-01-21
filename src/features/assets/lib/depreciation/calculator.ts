/**
 * @file calculator.ts
 * @description Asset depreciation calculator - straight-line method with pro-rata support
 * @module domains/operations/assets/depreciation
 *
 * DEPRECIATION METHOD:
 * Straight-line depreciation following Qatar Tax Rates and IFRS standards.
 *
 * FORMULA:
 * Monthly Depreciation = (Acquisition Cost - Salvage Value) / Useful Life in Months
 *
 * FEATURES:
 * - Monthly depreciation calculation
 * - Pro-rata for partial months (first month, disposal)
 * - Full schedule projection
 * - Summary with NBV, accumulated, remaining months
 * - Gain/loss calculation for disposal
 *
 * PRO-RATA CALCULATION:
 * - First month: Days remaining / Days in month
 * - Disposal: Days from last run / 30.44 (average days per month)
 */

import Decimal from 'decimal.js';

// FIN-003: Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DepreciationInput {
  /** Original cost of the asset */
  acquisitionCost: number;
  /** Expected value at end of useful life */
  salvageValue: number;
  /** Total useful life in months */
  usefulLifeMonths: number;
  /** Date depreciation starts (usually purchase date) */
  depreciationStartDate: Date;
  /** Already recorded depreciation */
  accumulatedDepreciation: number;
}

export interface MonthlyDepreciationResult {
  /** Depreciation amount for this period */
  monthlyAmount: number;
  /** Start of the period */
  periodStart: Date;
  /** End of the period */
  periodEnd: Date;
  /** Total accumulated after this period */
  newAccumulatedAmount: number;
  /** Net book value after this period */
  newNetBookValue: number;
  /** True if asset is fully depreciated after this period */
  isFullyDepreciated: boolean;
  /** 1.0 for full month, less for partial (first month/disposal) */
  proRataFactor: number;
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

export interface ProRataDepreciationResult {
  /** Number of days in the period */
  days: number;
  /** Depreciation amount for the period */
  amount: number;
  /** Total accumulated after this period */
  newAccumulatedAmount: number;
  /** Net book value after this period */
  newNetBookValue: number;
  /** Daily depreciation rate used */
  dailyRate: number;
  /** Start of the period */
  periodStart: Date;
  /** End of the period */
  periodEnd: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Round to 2 decimal places for currency.
 * FIN-003: Uses Decimal.js for precise banker's rounding (ROUND_HALF_UP)
 */
function round2(value: number): number {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Get the first day of a month.
 */
function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the last day of a month.
 */
function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MONTHLY DEPRECIATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate straight-line depreciation for a single month.
 *
 * Handles:
 * - Pro-rata for first month (if acquired mid-month)
 * - Caps at salvage value (won't depreciate below)
 * - Returns null if depreciation hasn't started or is complete
 *
 * @param input - Depreciation parameters
 * @param calculationDate - The month to calculate for (defaults to current month)
 * @returns Monthly depreciation result or null if no depreciation needed
 *
 * @example
 * const result = calculateMonthlyDepreciation({
 *   acquisitionCost: 10000,
 *   salvageValue: 1000,
 *   usefulLifeMonths: 36,
 *   depreciationStartDate: new Date('2025-01-15'),
 *   accumulatedDepreciation: 0,
 * }, new Date('2025-01-31'));
 * // Returns: { monthlyAmount: 137.50, proRataFactor: 0.55, ... }
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

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Validate inputs
  // ─────────────────────────────────────────────────────────────────────────────
  if (acquisitionCost <= 0 || usefulLifeMonths <= 0) {
    return null;
  }

  const depreciableAmount = acquisitionCost - salvageValue;
  if (depreciableAmount <= 0) {
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Calculate monthly depreciation (straight-line)
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

  // Calculate period boundaries
  const periodStart = getMonthStart(calculationDate);
  const periodEnd = getMonthEnd(calculationDate);

  // Normalize depreciation start date
  const startDate = new Date(depreciationStartDate);
  startDate.setHours(0, 0, 0, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Calculate pro-rata factor for first month
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Check remaining depreciable amount
  // ─────────────────────────────────────────────────────────────────────────────
  const remainingDepreciable = depreciableAmount - accumulatedDepreciation;
  if (remainingDepreciable <= 0) {
    return null; // Fully depreciated
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Calculate depreciation amount (capped at remaining)
  // ─────────────────────────────────────────────────────────────────────────────
  let depreciationAmount = monthlyDepreciation * proRataFactor;
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

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate full depreciation schedule for an asset (projected).
 *
 * Projects all monthly depreciation from start date until fully depreciated.
 * Useful for financial planning and reporting.
 *
 * @param input - Depreciation parameters
 * @returns Array of monthly depreciation results
 *
 * @example
 * const schedule = generateDepreciationSchedule({
 *   acquisitionCost: 10000,
 *   salvageValue: 1000,
 *   usefulLifeMonths: 36,
 *   depreciationStartDate: new Date('2025-01-01'),
 *   accumulatedDepreciation: 0,
 * });
 * // Returns 36 monthly entries
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate depreciation summary for an asset.
 *
 * Provides overview metrics for display in asset detail views.
 *
 * @param input - Depreciation parameters
 * @returns Summary with all key metrics
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

// ═══════════════════════════════════════════════════════════════════════════════
// PERIOD UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate how many months have passed since depreciation start.
 */
export function calculateMonthsElapsed(startDate: Date, endDate: Date = new Date()): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();

  return years * 12 + months;
}

/**
 * Check if depreciation has already been recorded for a specific period.
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

// ═══════════════════════════════════════════════════════════════════════════════
// PRO-RATA DEPRECIATION (DISPOSAL)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate pro-rata depreciation for a partial period (disposal scenario).
 *
 * Used when disposing an asset to calculate depreciation from the day after
 * the last depreciation run (or start date) to the disposal date.
 *
 * Per IFRS/IAS 16, depreciation should be calculated up to the disposal date.
 *
 * @param input - Depreciation input parameters
 * @param fromDate - Start of period (day after last depreciation, or start date)
 * @param toDate - End of period (disposal date, inclusive)
 * @returns Pro-rata depreciation result, or null if no depreciation needed
 *
 * @example
 * // Asset last depreciated Jan 31, disposed Feb 15
 * const result = calculateProRataDepreciation(input, new Date('2025-02-01'), new Date('2025-02-15'));
 * // Returns depreciation for 15 days
 */
export function calculateProRataDepreciation(
  input: DepreciationInput,
  fromDate: Date,
  toDate: Date
): ProRataDepreciationResult | null {
  const { acquisitionCost, salvageValue, usefulLifeMonths, accumulatedDepreciation } = input;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Validate inputs
  // ─────────────────────────────────────────────────────────────────────────────
  if (acquisitionCost <= 0 || usefulLifeMonths <= 0) {
    return null;
  }

  const depreciableAmount = acquisitionCost - salvageValue;
  if (depreciableAmount <= 0) {
    return null;
  }

  // Check if already fully depreciated
  const remainingDepreciable = depreciableAmount - accumulatedDepreciation;
  if (remainingDepreciable <= 0.01) {
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Normalize and validate dates
  // ─────────────────────────────────────────────────────────────────────────────
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);

  if (start > end) {
    return null; // Invalid date range
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Calculate days and daily rate
  // ─────────────────────────────────────────────────────────────────────────────
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;

  if (days <= 0) {
    return null;
  }

  // Daily rate = Monthly rate / 30.44 (average days per month)
  const monthlyDepreciation = depreciableAmount / usefulLifeMonths;
  const dailyRate = monthlyDepreciation / 30.44;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Calculate depreciation (capped at remaining)
  // ─────────────────────────────────────────────────────────────────────────────
  let periodDepreciation = dailyRate * days;
  periodDepreciation = Math.min(periodDepreciation, remainingDepreciable);

  const newAccumulatedAmount = accumulatedDepreciation + periodDepreciation;
  const newNetBookValue = acquisitionCost - newAccumulatedAmount;

  return {
    days,
    amount: round2(periodDepreciation),
    newAccumulatedAmount: round2(newAccumulatedAmount),
    newNetBookValue: round2(newNetBookValue),
    dailyRate: round2(dailyRate),
    periodStart: start,
    periodEnd: end,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPOSAL GAIN/LOSS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate gain or loss on asset disposal.
 *
 * Per IFRS/IAS 16:
 * - Gain = Disposal Proceeds > Net Book Value (positive result)
 * - Loss = Disposal Proceeds < Net Book Value (negative result)
 *
 * @param disposalProceeds - Amount received from disposal (0 for scrapped/donated)
 * @param netBookValueAtDisposal - NBV after final depreciation
 * @returns Positive number for gain, negative for loss
 *
 * @example
 * calculateDisposalGainLoss(5000, 3000); // Returns: 2000 (gain)
 * calculateDisposalGainLoss(1000, 3000); // Returns: -2000 (loss)
 * calculateDisposalGainLoss(0, 500);     // Returns: -500 (loss on write-off)
 */
export function calculateDisposalGainLoss(
  disposalProceeds: number,
  netBookValueAtDisposal: number
): number {
  return round2(disposalProceeds - netBookValueAtDisposal);
}
