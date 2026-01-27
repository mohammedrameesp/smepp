/**
 * @file utils.ts
 * @description Payroll utility functions for reference number generation, status management,
 *              financial calculations, and period handling
 * @module domains/hr/payroll
 *
 * Default Formats (configurable per organization):
 * - Payroll Runs: {PREFIX}-PAY-{YYYYMM}-{SEQ:2}
 * - Payslips: {PREFIX}-PS-{YYYYMM}-{SEQ:5}
 * - Loans: {PREFIX}-LOAN-{SEQ:5}
 */

import { PayrollStatus, LoanStatus } from '@prisma/client';
import { getOrganizationCodePrefix, getEntityFormat, applyFormat } from '@/lib/utils/code-prefix';
import Decimal from 'decimal.js';
import { getStatusColor } from '@/lib/constants';

// FIN-003: Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Generate payroll run reference number using configurable format.
 * Default: {PREFIX}-PAY-{YYYYMM}-{SEQ:2}
 * Example: ORG-PAY-202412-01, JAS-PAY-202412-01
 */
export async function generatePayrollReferenceWithPrefix(
  tenantId: string,
  year: number,
  month: number,
  sequence: number
): Promise<string> {
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'payroll-runs');

  // Create a date object for the pay period
  const date = new Date(year, month - 1, 1);

  return applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: sequence,
    date,
  });
}

/**
 * Generate payslip number using configurable format.
 * Default: {PREFIX}-PS-{YYYYMM}-{SEQ:5}
 * Example: ORG-PS-202412-00001, JAS-PS-202412-00001
 */
export async function generatePayslipNumberWithPrefix(
  tenantId: string,
  year: number,
  month: number,
  sequence: number
): Promise<string> {
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'payslips');

  // Create a date object for the pay period
  const date = new Date(year, month - 1, 1);

  return applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: sequence,
    date,
  });
}

/**
 * Generate loan number using configurable format.
 * Default: {PREFIX}-LOAN-{SEQ:5}
 * Example: ORG-LOAN-00001, JAS-LOAN-00001
 */
export async function generateLoanNumberWithPrefix(
  tenantId: string,
  sequence: number
): Promise<string> {
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'loans');

  return applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: sequence,
    date: new Date(),
  });
}

/**
 * Calculate gross salary from components
 */
export function calculateGrossSalary(components: {
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  foodAllowance?: number;
  phoneAllowance?: number;
  otherAllowances?: number;
}): number {
  return (
    components.basicSalary +
    (components.housingAllowance || 0) +
    (components.transportAllowance || 0) +
    (components.foodAllowance || 0) +
    (components.phoneAllowance || 0) +
    (components.otherAllowances || 0)
  );
}

/**
 * Get payroll status variant for badges
 */
export function getPayrollStatusVariant(status: PayrollStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'DRAFT':
      return 'outline';
    case 'PENDING_APPROVAL':
      return 'secondary';
    case 'APPROVED':
      return 'default';
    case 'PROCESSED':
      return 'default';
    case 'PAID':
      return 'default';
    case 'CANCELLED':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get payroll status color (hex).
 * Uses centralized STATUS_COLORS from @/lib/constants.
 */
export function getPayrollStatusColor(status: PayrollStatus): string {
  return getStatusColor(status).hex;
}

/**
 * Get payroll status display text
 */
export function getPayrollStatusText(status: PayrollStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_APPROVAL':
      return 'Pending Approval';
    case 'APPROVED':
      return 'Approved';
    case 'PROCESSED':
      return 'Processed';
    case 'PAID':
      return 'Paid';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Get loan status variant for badges
 */
export function getLoanStatusVariant(status: LoanStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'PAUSED':
      return 'secondary';
    case 'COMPLETED':
      return 'outline';
    case 'WRITTEN_OFF':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Get loan status color (hex).
 * Uses centralized STATUS_COLORS from @/lib/constants.
 */
export function getLoanStatusColor(status: LoanStatus): string {
  return getStatusColor(status).hex;
}

/**
 * Get loan status display text
 */
export function getLoanStatusText(status: LoanStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'PAUSED':
      return 'Paused';
    case 'COMPLETED':
      return 'Completed';
    case 'WRITTEN_OFF':
      return 'Written Off';
    default:
      return status;
  }
}

/**
 * Check if payroll can transition to a new status
 */
export function canTransitionTo(currentStatus: PayrollStatus, newStatus: PayrollStatus): boolean {
  const transitions: Record<PayrollStatus, PayrollStatus[]> = {
    DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
    APPROVED: ['PROCESSED', 'PENDING_APPROVAL', 'CANCELLED'],
    PROCESSED: ['PAID', 'APPROVED'],
    PAID: [],
    CANCELLED: ['DRAFT'],
  };

  return transitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Get month name
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
}

/**
 * Get short month name
 */
export function getShortMonthName(month: number): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return months[month - 1] || '';
}

/**
 * Format pay period display
 */
export function formatPayPeriod(year: number, month: number): string {
  return `${getMonthName(month)} ${year}`;
}

/**
 * Get period start date (first day of month)
 */
export function getPeriodStartDate(year: number, month: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Get period end date (last day of month)
 */
export function getPeriodEndDate(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Calculate daily salary rate
 * FIN-003: Uses precise division
 */
export function calculateDailySalary(grossSalary: number): number {
  return divideMoney(grossSalary, 30);
}

/**
 * Calculate loan end date based on start date and installments
 * FIN-009: Properly handles month-end edge cases (e.g., Jan 31 + 1 month = Feb 28/29)
 */
export function calculateLoanEndDate(startDate: Date, installments: number): Date {
  const start = new Date(startDate);
  const targetMonth = start.getMonth() + installments - 1;
  const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12; // Handle negative months

  // Get the last day of the target month
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();

  // Use the original day or the last day of month, whichever is smaller
  const targetDay = Math.min(start.getDate(), lastDayOfTargetMonth);

  return new Date(targetYear, normalizedMonth, targetDay);
}

/**
 * Format decimal to 2 decimal places
 * FIN-003: Uses Decimal.js for precise rounding
 */
export function toFixed2(value: number): number {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Parse decimal from Prisma Decimal type
 * FIN-003: Returns Decimal for precise calculations, use .toNumber() when needed for display
 */
export function parseDecimal(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Decimal(value).toNumber();
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

/**
 * FIN-003: Precise addition of financial amounts
 */
export function addMoney(...amounts: number[]): number {
  return amounts
    .reduce((sum, amt) => sum.plus(new Decimal(amt)), new Decimal(0))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * FIN-003: Precise subtraction of financial amounts
 */
export function subtractMoney(from: number, ...amounts: number[]): number {
  return amounts
    .reduce((result, amt) => result.minus(new Decimal(amt)), new Decimal(from))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * FIN-003: Precise multiplication for financial amounts
 */
export function multiplyMoney(amount: number, multiplier: number): number {
  return new Decimal(amount)
    .times(new Decimal(multiplier))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/**
 * FIN-003: Precise division for financial amounts
 */
export function divideMoney(amount: number, divisor: number): number {
  if (divisor === 0) return 0;
  return new Decimal(amount)
    .dividedBy(new Decimal(divisor))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}
