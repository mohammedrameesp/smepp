import { PayrollStatus, LoanStatus } from '@prisma/client';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

/**
 * Generate payroll run reference number (legacy - without org prefix)
 * Format: PAY-YYYY-MM-XXX
 * @deprecated Use generatePayrollReferenceWithPrefix instead
 */
export function generatePayrollReference(year: number, month: number, sequence: number): string {
  const monthStr = month.toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(3, '0');
  return `PAY-${year}-${monthStr}-${seqStr}`;
}

/**
 * Generate payroll run reference number with organization prefix
 * Format: {PREFIX}-PAY-YYYY-MM-XXX
 * Example: BCE-PAY-2024-12-001, JAS-PAY-2024-12-001
 */
export async function generatePayrollReferenceWithPrefix(
  tenantId: string,
  year: number,
  month: number,
  sequence: number
): Promise<string> {
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const monthStr = month.toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(3, '0');
  return `${codePrefix}-PAY-${year}-${monthStr}-${seqStr}`;
}

/**
 * Generate payslip number (legacy - without org prefix)
 * Format: PS-YYYY-MM-XXXXX
 * @deprecated Use generatePayslipNumberWithPrefix instead
 */
export function generatePayslipNumber(year: number, month: number, sequence: number): string {
  const monthStr = month.toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(5, '0');
  return `PS-${year}-${monthStr}-${seqStr}`;
}

/**
 * Generate payslip number with organization prefix
 * Format: {PREFIX}-PS-YYYY-MM-XXXXX
 * Example: BCE-PS-2024-12-00001, JAS-PS-2024-12-00001
 */
export async function generatePayslipNumberWithPrefix(
  tenantId: string,
  year: number,
  month: number,
  sequence: number
): Promise<string> {
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const monthStr = month.toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(5, '0');
  return `${codePrefix}-PS-${year}-${monthStr}-${seqStr}`;
}

/**
 * Generate loan number (legacy - without org prefix)
 * Format: LOAN-XXXXX
 * @deprecated Use generateLoanNumberWithPrefix instead
 */
export function generateLoanNumber(sequence: number): string {
  return `LOAN-${sequence.toString().padStart(5, '0')}`;
}

/**
 * Generate loan number with organization prefix
 * Format: {PREFIX}-LOAN-XXXXX
 * Example: BCE-LOAN-00001, JAS-LOAN-00001
 */
export async function generateLoanNumberWithPrefix(
  tenantId: string,
  sequence: number
): Promise<string> {
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  return `${codePrefix}-LOAN-${sequence.toString().padStart(5, '0')}`;
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
 * Get payroll status color
 */
export function getPayrollStatusColor(status: PayrollStatus): string {
  switch (status) {
    case 'DRAFT':
      return '#6B7280'; // Gray
    case 'PENDING_APPROVAL':
      return '#F59E0B'; // Amber
    case 'APPROVED':
      return '#3B82F6'; // Blue
    case 'PROCESSED':
      return '#8B5CF6'; // Purple
    case 'PAID':
      return '#10B981'; // Green
    case 'CANCELLED':
      return '#EF4444'; // Red
    default:
      return '#6B7280';
  }
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
 * Get loan status color
 */
export function getLoanStatusColor(status: LoanStatus): string {
  switch (status) {
    case 'ACTIVE':
      return '#10B981'; // Green
    case 'PAUSED':
      return '#F59E0B'; // Amber
    case 'COMPLETED':
      return '#6B7280'; // Gray
    case 'WRITTEN_OFF':
      return '#EF4444'; // Red
    default:
      return '#6B7280';
  }
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
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'QAR'): string {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
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
 */
export function calculateDailySalary(grossSalary: number): number {
  return grossSalary / 30;
}

/**
 * Calculate loan end date based on start date and installments
 */
export function calculateLoanEndDate(startDate: Date, installments: number): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + installments - 1);
  return endDate;
}

/**
 * Format decimal to 2 decimal places
 */
export function toFixed2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Parse decimal from Prisma Decimal type
 */
export function parseDecimal(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}
