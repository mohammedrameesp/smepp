/**
 * @file payroll.ts
 * @description Type definitions for the payroll module
 * @module domains/hr/payroll/types
 *
 * DOMAINS:
 * - Salary Structures: Employee compensation breakdown and history
 * - Payroll Runs: Monthly payroll processing workflow
 * - Payslips: Individual employee payment records
 * - Loans: Employee loans and salary advances
 * - Gratuity: End of service benefit calculations
 * - WPS: Qatar Wage Protection System file generation
 *
 * CURRENCY:
 * All monetary values are in QAR (Qatari Riyal) unless otherwise specified.
 */

import { PayrollStatus, LoanStatus, DeductionType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// SALARY STRUCTURE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Individual custom allowance item for salary structure.
 * Used when standard allowance categories don't fit.
 */
export interface OtherAllowanceItem {
  /** Display name of the allowance (e.g., "Education Allowance") */
  name: string;
  /** Monthly amount in QAR */
  amount: number;
}

/**
 * Employee salary structure defining compensation breakdown.
 * Each employee can have one active salary structure at a time.
 * Historical structures are retained for audit purposes.
 */
export interface SalaryStructure {
  /** Unique identifier (CUID) */
  id: string;
  /** Reference to the employee (OrganizationMember) */
  userId: string;
  /** Base monthly salary before allowances (QAR) */
  basicSalary: number;
  /** Monthly housing/accommodation allowance (QAR) */
  housingAllowance: number;
  /** Monthly transportation allowance (QAR) */
  transportAllowance: number;
  /** Monthly food/meal allowance (QAR) */
  foodAllowance: number;
  /** Monthly phone/communication allowance (QAR) */
  phoneAllowance: number;
  /** Sum of all custom/other allowances (QAR) */
  otherAllowances: number;
  /** Breakdown of custom allowances by name and amount */
  otherAllowancesDetails?: OtherAllowanceItem[] | null;
  /** Total monthly compensation (basic + all allowances) */
  grossSalary: number;
  /** Currency code (default: QAR) */
  currency: string;
  /** Date this structure becomes effective (ISO string) */
  effectiveFrom: string;
  /** Date this structure ends (ISO string), null if current */
  effectiveTo?: string | null;
  /** Whether this is the current active structure for the employee */
  isActive: boolean;
  /** Record creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Employee details (populated via relation) */
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

/**
 * Audit trail entry for salary structure changes.
 * Records all modifications to salary structures for compliance.
 */
export interface SalaryStructureHistory {
  /** Unique identifier */
  id: string;
  /** Reference to the modified salary structure */
  salaryStructureId: string;
  /** Type of action performed (CREATE, UPDATE, DEACTIVATE) */
  action: string;
  /** Changed field values after the action */
  changes?: Record<string, unknown> | null;
  /** Field values before the change */
  previousValues?: Record<string, unknown> | null;
  /** Optional notes explaining the change */
  notes?: string | null;
  /** User who performed the action */
  performedById: string;
  /** User details (populated via relation) */
  performedBy?: {
    id: string;
    name: string | null;
  };
  /** Timestamp of the action */
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL RUN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Monthly payroll run representing a complete payroll cycle.
 *
 * WORKFLOW STATES:
 * DRAFT → PROCESSED → PENDING_APPROVAL → APPROVED → PAID
 *                  ↓                   ↓
 *              CANCELLED          CANCELLED
 *
 * - DRAFT: Initial state, no payslips generated yet
 * - PROCESSED: Payslips calculated and generated
 * - PENDING_APPROVAL: Submitted for manager/finance approval
 * - APPROVED: Approved, ready for payment
 * - PAID: Payment completed, WPS file submitted
 * - CANCELLED: Payroll run cancelled (can be deleted)
 */
export interface PayrollRun {
  /** Unique identifier (CUID) */
  id: string;
  /** Human-readable reference (format: ORG-PAY-YYYY-MM-SEQ) */
  referenceNumber: string;
  /** Payroll year (e.g., 2024) */
  year: number;
  /** Payroll month (1-12) */
  month: number;
  /** First day of the pay period (ISO string) */
  periodStart: string;
  /** Last day of the pay period (ISO string) */
  periodEnd: string;
  /** Current workflow status */
  status: PayrollStatus;
  /** Sum of all employee gross salaries (QAR) */
  totalGross: number;
  /** Sum of all deductions (loans + unpaid leave) */
  totalDeductions: number;
  /** Total net payable (gross - deductions) */
  totalNet: number;
  /** Number of employees included in this run */
  employeeCount: number;
  /** Whether WPS file has been generated */
  wpsFileGenerated: boolean;
  /** URL to stored WPS file (if generated) */
  wpsFileUrl?: string | null;
  /** Timestamp when WPS was generated */
  wpsGeneratedAt?: string | null;
  /** User who submitted for approval */
  submittedById?: string | null;
  /** Timestamp of submission */
  submittedAt?: string | null;
  /** User who approved the payroll */
  approvedById?: string | null;
  /** Timestamp of approval */
  approvedAt?: string | null;
  /** Notes from the approver */
  approverNotes?: string | null;
  /** User who processed (generated payslips) */
  processedById?: string | null;
  /** Timestamp of processing */
  processedAt?: string | null;
  /** User who marked as paid */
  paidById?: string | null;
  /** Timestamp of payment */
  paidAt?: string | null;
  /** Bank transfer reference number */
  paymentReference?: string | null;
  /** User who created the payroll run */
  createdById: string;
  /** Record creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Creator details */
  createdBy?: {
    id: string;
    name: string | null;
  };
  /** Submitter details */
  submittedBy?: {
    id: string;
    name: string | null;
  } | null;
  /** Approver details */
  approvedBy?: {
    id: string;
    name: string | null;
  } | null;
  /** Processor details */
  processedBy?: {
    id: string;
    name: string | null;
  } | null;
  /** Payer details */
  paidBy?: {
    id: string;
    name: string | null;
  } | null;
  /** Associated payslips (populated via relation) */
  payslips?: Payslip[];
  /** Payslip count for list views */
  _count?: {
    payslips: number;
  };
}

/**
 * Audit trail entry for payroll run status changes.
 * Tracks the workflow progression for compliance and debugging.
 */
export interface PayrollHistory {
  /** Unique identifier */
  id: string;
  /** Reference to the payroll run */
  payrollRunId: string;
  /** Action type (STATUS_CHANGE, PROCESS, APPROVE, etc.) */
  action: string;
  /** Status before the action */
  previousStatus?: PayrollStatus | null;
  /** Status after the action */
  newStatus?: PayrollStatus | null;
  /** Additional data changes */
  changes?: Record<string, unknown> | null;
  /** Optional notes about the action */
  notes?: string | null;
  /** User who performed the action */
  performedById: string;
  /** User details */
  performedBy?: {
    id: string;
    name: string | null;
  };
  /** Timestamp of the action */
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYSLIP TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Individual employee payslip for a payroll period.
 * Generated during payroll processing with salary breakdown and deductions.
 * Used for WPS file generation and employee salary records.
 */
export interface Payslip {
  /** Unique identifier (CUID) */
  id: string;
  /** Human-readable reference (format: ORG-PS-YYYY-MM-XXXXX) */
  payslipNumber: string;
  /** Reference to parent payroll run */
  payrollRunId: string;
  /** Reference to the employee */
  userId: string;
  /** Base salary component (QAR) */
  basicSalary: number;
  /** Housing allowance component (QAR) */
  housingAllowance: number;
  /** Transport allowance component (QAR) */
  transportAllowance: number;
  /** Food allowance component (QAR) */
  foodAllowance: number;
  /** Phone allowance component (QAR) */
  phoneAllowance: number;
  /** Other allowances total (QAR) */
  otherAllowances: number;
  /** JSON string of other allowance breakdown */
  otherAllowancesDetails?: string | null;
  /** Total before deductions (QAR) */
  grossSalary: number;
  /** Sum of all deductions (QAR) */
  totalDeductions: number;
  /** Take-home amount (gross - deductions) */
  netSalary: number;
  /** Employee's bank name for WPS */
  bankName?: string | null;
  /** International Bank Account Number for WPS */
  iban?: string | null;
  /** Qatar ID number for WPS */
  qidNumber?: string | null;
  /** Whether payment has been made */
  isPaid: boolean;
  /** Payment timestamp */
  paidAt?: string | null;
  /** Record creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Employee details with HR profile */
  user?: {
    id: string;
    name: string | null;
    email: string;
    hrProfile?: {
      employeeId?: string | null;
      designation?: string | null;
      dateOfJoining?: string | null;
    } | null;
  };
  /** Parent payroll run summary */
  payrollRun?: {
    id: string;
    referenceNumber: string;
    year: number;
    month: number;
    status: PayrollStatus;
  };
  /** List of deductions applied to this payslip */
  deductions?: PayslipDeduction[];
}

/**
 * Individual deduction line item on a payslip.
 * Tracks loan repayments, unpaid leave deductions, and other deductions.
 */
export interface PayslipDeduction {
  /** Unique identifier */
  id: string;
  /** Reference to parent payslip */
  payslipId: string;
  /** Type of deduction (LOAN, LEAVE, ADVANCE, OTHER) */
  type: DeductionType;
  /** Human-readable description */
  description: string;
  /** Deduction amount (QAR) */
  amount: number;
  /** Reference to leave request (if LEAVE type) */
  leaveRequestId?: string | null;
  /** Reference to loan (if LOAN type) */
  loanId?: string | null;
  /** Reference to advance (if ADVANCE type) */
  advanceId?: string | null;
  /** Record creation timestamp */
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Employee loan or salary advance record.
 *
 * LOAN TYPES:
 * - LOAN: Long-term loan with fixed monthly deductions
 * - ADVANCE: Short-term salary advance, typically repaid in 1-3 months
 *
 * LOAN STATES:
 * - ACTIVE: Loan is being repaid via payroll deductions
 * - PAUSED: Deductions temporarily suspended
 * - COMPLETED: Fully repaid
 * - WRITTEN_OFF: Loan cancelled without full repayment
 */
export interface EmployeeLoan {
  /** Unique identifier (CUID) */
  id: string;
  /** Human-readable reference (format: ORG-LOAN-XXXXX) */
  loanNumber: string;
  /** Reference to the borrowing employee */
  userId: string;
  /** Type: LOAN (long-term) or ADVANCE (short-term) */
  type: 'LOAN' | 'ADVANCE';
  /** Purpose/reason for the loan */
  description: string;
  /** Original loan amount disbursed (QAR) */
  principalAmount: number;
  /** Total amount including any interest (QAR) - currently same as principal */
  totalAmount: number;
  /** Fixed monthly deduction amount (QAR) */
  monthlyDeduction: number;
  /** Sum of all repayments made (QAR) */
  totalPaid: number;
  /** Outstanding balance (totalAmount - totalPaid) */
  remainingAmount: number;
  /** Date loan disbursement started */
  startDate: string;
  /** Expected completion date based on installments */
  endDate?: string | null;
  /** Total number of planned installments */
  installments: number;
  /** Number of installments paid */
  installmentsPaid: number;
  /** Current loan status */
  status: LoanStatus;
  /** User who approved the loan */
  approvedById?: string | null;
  /** Timestamp of approval */
  approvedAt?: string | null;
  /** Additional notes about the loan */
  notes?: string | null;
  /** User who created the loan record */
  createdById: string;
  /** Record creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Borrower details */
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  /** Approver details */
  approvedBy?: {
    id: string;
    name: string | null;
  } | null;
  /** Creator details */
  createdBy?: {
    id: string;
    name: string | null;
  };
  /** Repayment history */
  repayments?: LoanRepayment[];
}

/**
 * Individual loan repayment record.
 * Created automatically during payroll processing or manually for cash payments.
 */
export interface LoanRepayment {
  /** Unique identifier */
  id: string;
  /** Reference to parent loan */
  loanId: string;
  /** Repayment amount (QAR) */
  amount: number;
  /** Reference to payslip (if SALARY_DEDUCTION) */
  payslipId?: string | null;
  /** Date of payment */
  paymentDate: string;
  /** How the payment was made */
  paymentMethod: 'SALARY_DEDUCTION' | 'CASH' | 'BANK_TRANSFER';
  /** Bank transfer or receipt reference */
  reference?: string | null;
  /** Additional notes */
  notes?: string | null;
  /** User who recorded the payment */
  recordedById: string;
  /** Recorder details */
  recordedBy?: {
    id: string;
    name: string | null;
  };
  /** Record creation timestamp */
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRATUITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * End of Service Benefits (Gratuity) calculation result.
 *
 * QATAR FORMULA (Custom):
 * - 3 weeks of BASIC salary per year of service (constant rate)
 * - Pro-rated for partial years
 * - Weekly rate = (Basic / 30) * 7
 *
 * FIN-006: Minimum 12 months service required for eligibility.
 */
export interface GratuityCalculation {
  /** Monthly basic salary used for calculation (QAR) */
  basicSalary: number;
  /** Complete years of service */
  yearsOfService: number;
  /** Total months of service (may include partial year) */
  monthsOfService: number;
  /** Approximate days of service */
  daysOfService: number;
  /** Weeks per year rate used (3 for Qatar) */
  weeksPerYear: number;
  /** Final calculated gratuity amount (QAR) */
  gratuityAmount: number;
  /** Daily salary rate (basic / 30) */
  dailyRate: number;
  /** Weekly salary rate (daily * 7) */
  weeklyRate: number;
  /** Breakdown of gratuity calculation */
  breakdown: {
    /** Gratuity for complete years */
    fullYearsAmount: number;
    /** Gratuity for partial year (pro-rated) */
    partialYearAmount: number;
  };
  /** FIN-006: Whether employee is ineligible (< 12 months) */
  ineligible?: boolean;
  /** FIN-006: Reason for ineligibility */
  ineligibleReason?: string;
}

/**
 * Future gratuity projection at a specific date.
 * Used for employee financial planning.
 */
export interface GratuityProjection {
  /** Years from now */
  years: number;
  /** Projected date (ISO string) */
  date: string;
  /** Projected gratuity amount at that date (QAR) */
  amount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard pagination metadata for list endpoints.
 */
export interface PaginationInfo {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether more pages exist */
  hasMore: boolean;
}

/** Paginated salary structures response */
export interface SalaryStructuresResponse {
  salaryStructures: SalaryStructure[];
  pagination: PaginationInfo;
}

/** Paginated payroll runs response */
export interface PayrollRunsResponse {
  runs: PayrollRun[];
  pagination: PaginationInfo;
}

/** Paginated payslips response */
export interface PayslipsResponse {
  payslips: Payslip[];
  pagination: PaginationInfo;
}

/** Paginated loans response */
export interface LoansResponse {
  loans: EmployeeLoan[];
  pagination: PaginationInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WPS (WAGE PROTECTION SYSTEM) TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Employee record for WPS SIF file generation.
 * Contains all required fields for Qatar's Wage Protection System.
 */
export interface WPSEmployeeRecord {
  /** Qatar ID number (11 digits) */
  qidNumber: string;
  /** Employee full name (uppercase for WPS) */
  employeeName: string;
  /** Bank SWIFT/BIC code (4 chars) */
  bankCode: string;
  /** International Bank Account Number (29 chars) */
  iban: string;
  /** Basic salary component (QAR) */
  basicSalary: number;
  /** Housing allowance component (QAR) */
  housingAllowance: number;
  /** Sum of all other allowances (QAR) */
  otherAllowances: number;
  /** Total deductions from salary (QAR) */
  totalDeductions: number;
  /** Net salary to be transferred (QAR) */
  netSalary: number;
}

/**
 * WPS SIF file header (Salary Control Record).
 * Contains employer and batch information.
 */
export interface WPSFileHeader {
  /** Employer Ministry of Labour ID (10 chars) */
  employerMolId: string;
  /** Employer/company name */
  employerName: string;
  /** Payment month (1-12) */
  paymentMonth: number;
  /** Payment year (e.g., 2024) */
  paymentYear: number;
  /** Scheduled payment date */
  paymentDate: Date;
  /** Number of employee records in file */
  totalRecords: number;
  /** Sum of all net salaries (QAR) */
  totalAmount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD STATS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregated statistics for the payroll dashboard.
 * Provides quick overview of payroll status for the organization.
 */
export interface PayrollDashboardStats {
  /** Number of employees with active salary structures */
  totalEmployees: number;
  /** Sum of all active gross salaries (monthly) */
  totalMonthlyPayroll: number;
  /** Count of payroll runs pending approval */
  pendingPayrolls: number;
  /** Count of active (unpaid) loans */
  activeLoans: number;
  /** Sum of remaining balances on all active loans */
  totalLoanOutstanding: number;
  /** Status of current month's payroll run (if exists) */
  currentMonthStatus?: PayrollStatus | null;
}
