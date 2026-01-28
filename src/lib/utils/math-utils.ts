/**
 * @file math-utils.ts
 * @description Shared mathematical utilities for consistent calculations across the codebase
 * @module lib/utils
 */

/**
 * Format a number to a fixed number of decimal places.
 * Provides a consistent, typed wrapper around toFixed().
 *
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 *
 * @example
 * formatNumber(123.456) // "123.46"
 * formatNumber(123.456, 0) // "123"
 * formatNumber(123.456, 4) // "123.4560"
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '0.00';
  return value.toFixed(decimals);
}

/**
 * Calculate a percentage of a total value.
 *
 * @param total - The total amount
 * @param percentage - The percentage to calculate (e.g., 25 for 25%)
 * @param decimals - Decimal places for result (default: 2)
 * @returns The calculated amount
 *
 * @example
 * calculatePercentage(10000, 25) // 2500
 * calculatePercentage(15000, 40) // 6000
 * calculatePercentage(1234.56, 33.33) // 411.48
 */
export function calculatePercentage(
  total: number,
  percentage: number,
  decimals: number = 2
): number {
  if (!Number.isFinite(total) || !Number.isFinite(percentage)) return 0;
  return parseFloat(((total * percentage) / 100).toFixed(decimals));
}

/**
 * Calculate inverse percentage (useful for depreciation rates).
 * Given years, returns the annual percentage rate.
 *
 * @param years - Number of years
 * @param decimals - Decimal places for result (default: 2)
 * @returns Annual percentage rate
 *
 * @example
 * calculateAnnualRate(5) // 20 (20% per year)
 * calculateAnnualRate(10) // 10 (10% per year)
 * calculateAnnualRate(3) // 33.33
 */
export function calculateAnnualRate(years: number, decimals: number = 2): number {
  if (!Number.isFinite(years) || years <= 0) return 0;
  return parseFloat((100 / years).toFixed(decimals));
}

/**
 * Round a number to a specified number of decimal places.
 * Unlike toFixed, this returns a number not a string.
 *
 * @param value - Number to round
 * @param decimals - Decimal places (default: 2)
 * @returns Rounded number
 *
 * @example
 * roundTo(123.456) // 123.46
 * roundTo(123.456, 1) // 123.5
 * roundTo(123.456, 0) // 123
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

