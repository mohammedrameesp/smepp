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
 * Format a number as a percentage value with decimal places.
 *
 * @param value - Number to format (e.g., 0.156 or 15.6)
 * @param decimals - Number of decimal places (default: 2)
 * @param multiply - Whether to multiply by 100 first (default: false)
 * @returns Formatted percentage string without % symbol
 *
 * @example
 * formatPercent(15.678) // "15.68"
 * formatPercent(0.156, 2, true) // "15.60"
 */
export function formatPercent(
  value: number,
  decimals: number = 2,
  multiply: boolean = false
): string {
  if (!Number.isFinite(value)) return '0.00';
  const percentValue = multiply ? value * 100 : value;
  return percentValue.toFixed(decimals);
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
 * Calculate what percentage one value is of another.
 *
 * @param part - The partial amount
 * @param total - The total amount
 * @param decimals - Decimal places for result (default: 2)
 * @returns The percentage (e.g., 25 for 25%)
 *
 * @example
 * calculatePercentageOf(250, 1000) // 25
 * calculatePercentageOf(333, 1000) // 33.3
 */
export function calculatePercentageOf(
  part: number,
  total: number,
  decimals: number = 2
): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total === 0) return 0;
  return parseFloat(((part / total) * 100).toFixed(decimals));
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

/**
 * Clamp a value between a minimum and maximum.
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 *
 * @example
 * clamp(150, 0, 100) // 100
 * clamp(-50, 0, 100) // 0
 * clamp(50, 0, 100) // 50
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate salary component based on gross salary and percentage.
 * Commonly used in payroll calculations.
 *
 * @param grossSalary - Total gross salary
 * @param percentage - Component percentage
 * @returns Component amount rounded to 2 decimals
 *
 * @example
 * calculateSalaryComponent(10000, 40) // 4000 (basic salary at 40%)
 * calculateSalaryComponent(10000, 25) // 2500 (housing at 25%)
 */
export function calculateSalaryComponent(
  grossSalary: number,
  percentage: number
): number {
  return calculatePercentage(grossSalary, percentage, 2);
}

/**
 * Convert amount between currencies using exchange rate.
 *
 * @param amount - Amount to convert
 * @param rate - Exchange rate (target per source)
 * @param decimals - Decimal places (default: 2)
 * @returns Converted amount
 *
 * @example
 * convertCurrency(100, 3.64) // 364 (USD to QAR at 3.64)
 * convertCurrency(364, 1/3.64) // 100 (QAR to USD)
 */
export function convertCurrency(
  amount: number,
  rate: number,
  decimals: number = 2
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate === 0) return 0;
  return roundTo(amount * rate, decimals);
}
