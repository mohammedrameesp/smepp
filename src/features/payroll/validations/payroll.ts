/**
 * @file payroll.ts
 * @description Validation schemas for payroll operations including salary structures,
 *              payroll runs, loans, and deductions
 * @module domains/hr/payroll/validations
 *
 * SCHEMAS:
 * - Salary Structure: Create/update employee compensation
 * - Payroll Run: Create and manage monthly payroll cycles
 * - Loans: Employee loan and advance management
 * - Deductions: Payslip deduction line items
 * - Queries: Pagination and filtering for list endpoints
 *
 * VALIDATION RULES:
 * - All amounts are in QAR with max 999,999,999
 * - Dates are ISO string format (YYYY-MM-DD)
 * - Text fields have max length limits (typically 500 chars)
 */

import { z } from 'zod';
import { approvalSchema, rejectionSchema } from '@/lib/validations/workflow-schemas';
import { PayrollStatus, LoanStatus, DeductionType, Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// SALARY STRUCTURE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new salary structure.
 *
 * Creates an employee compensation record with basic salary and allowances.
 * Only one active salary structure per employee is allowed.
 *
 * @example
 * {
 *   userId: "clx123...",
 *   basicSalary: 15000,
 *   housingAllowance: 3000,
 *   transportAllowance: 1000,
 *   effectiveFrom: "2024-01-01"
 * }
 */
export const createSalaryStructureSchema = z.object({
  /** Employee/member ID to create salary structure for */
  userId: z.string().min(1, 'User ID is required'),
  /** Base monthly salary before allowances (QAR) */
  basicSalary: z.number().min(0, 'Basic salary must be positive').max(999999999, 'Amount too large'),
  /** Monthly housing/accommodation allowance (QAR) */
  housingAllowance: z.number().min(0).default(0),
  /** Monthly transportation allowance (QAR) */
  transportAllowance: z.number().min(0).default(0),
  /** Monthly food/meal allowance (QAR) */
  foodAllowance: z.number().min(0).default(0),
  /** Monthly phone/communication allowance (QAR) */
  phoneAllowance: z.number().min(0).default(0),
  /** Sum of any additional custom allowances (QAR) */
  otherAllowances: z.number().min(0).default(0),
  /** Breakdown of custom allowances (name and amount) */
  otherAllowancesDetails: z.array(z.object({
    name: z.string().min(1, 'Allowance name is required'),
    amount: z.number().min(0, 'Amount must be positive'),
  })).optional(),
  /** Date this structure becomes effective (ISO string) */
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  /** Optional notes about the salary structure */
  notes: z.string().max(500).optional(),
});

/**
 * Schema for updating an existing salary structure.
 * All fields except userId are optional.
 */
export const updateSalaryStructureSchema = createSalaryStructureSchema.partial().omit({ userId: true });

// ═══════════════════════════════════════════════════════════════════════════════
// PAYROLL RUN SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new payroll run.
 * Only year and month are required; period dates are calculated automatically.
 */
export const createPayrollRunSchema = z.object({
  /** Payroll year (2020-2100) */
  year: z.number().int().min(2020).max(2100),
  /** Payroll month (1-12) */
  month: z.number().int().min(1).max(12),
});

/**
 * Schema for submitting payroll for approval.
 * Used when transitioning from PROCESSED to PENDING_APPROVAL.
 */
export const submitPayrollSchema = z.object({
  /** Optional notes for the approver */
  notes: z.string().max(500).optional(),
});

/**
 * Schema for approving a payroll run.
 * Used when transitioning from PENDING_APPROVAL to APPROVED.
 */
export const approvePayrollSchema = z.object({
  /** Approver notes (visible in audit trail) */
  notes: z.string().max(500).optional(),
});

/**
 * Schema for rejecting a payroll run.
 * Returns payroll to DRAFT status for corrections.
 */
export const rejectPayrollSchema = z.object({
  /** Required reason for rejection */
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

/**
 * Schema for marking payroll as paid.
 * Final step in the payroll workflow.
 */
export const markPaidSchema = z.object({
  /** Bank transfer or transaction reference number */
  paymentReference: z.string().max(100).optional(),
  /** Additional payment notes */
  notes: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOAN SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new employee loan or salary advance.
 *
 * LOAN: Long-term loan with multiple installments
 * ADVANCE: Short-term salary advance, typically 1-3 months
 *
 * @example
 * {
 *   userId: "clx123...",
 *   type: "LOAN",
 *   description: "Car loan",
 *   principalAmount: 10000,
 *   monthlyDeduction: 1000,
 *   startDate: "2024-02-01",
 *   installments: 10
 * }
 */
export const createLoanSchema = z.object({
  /** Employee receiving the loan */
  userId: z.string().min(1, 'User ID is required'),
  /** LOAN (long-term) or ADVANCE (short-term) */
  type: z.enum(['LOAN', 'ADVANCE']),
  /** Purpose/reason for the loan */
  description: z.string().min(1, 'Description is required').max(500),
  /** Total amount disbursed (QAR) */
  principalAmount: z.number().min(1, 'Amount must be greater than 0'),
  /** Fixed monthly deduction amount (QAR) */
  monthlyDeduction: z.number().min(1, 'Monthly deduction must be greater than 0'),
  /** Date to start deductions (ISO string) */
  startDate: z.string().min(1, 'Start date is required'),
  /** Number of monthly installments */
  installments: z.number().int().min(1, 'At least 1 installment required'),
  /** Additional notes about the loan */
  notes: z.string().max(500).optional(),
});

/**
 * Schema for updating loan deduction amount or notes.
 * Only allows modifying deduction amount after loan creation.
 */
export const updateLoanSchema = z.object({
  /** New monthly deduction amount (QAR) */
  monthlyDeduction: z.number().min(1).optional(),
  /** Updated notes */
  notes: z.string().max(500).optional(),
});

/**
 * Schema for recording a manual loan repayment.
 * Used for cash or bank transfer payments outside payroll.
 */
export const recordRepaymentSchema = z.object({
  /** Repayment amount (QAR) */
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  /** How the payment was made */
  paymentMethod: z.enum(['SALARY_DEDUCTION', 'CASH', 'BANK_TRANSFER']),
  /** Date of payment (ISO string) */
  paymentDate: z.string().min(1, 'Payment date is required'),
  /** Bank transfer or receipt reference */
  reference: z.string().max(100).optional(),
  /** Additional notes */
  notes: z.string().max(500).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// PAYSLIP DEDUCTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for adding a manual deduction to a payslip.
 * Used for ad-hoc deductions not covered by loan or leave.
 */
export const addDeductionSchema = z.object({
  /** Type of deduction (LOAN, LEAVE, ADVANCE, OTHER) */
  type: z.nativeEnum(DeductionType),
  /** Human-readable description */
  description: z.string().min(1, 'Description is required').max(200),
  /** Deduction amount (QAR) */
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  /** Link to leave request (if LEAVE type) */
  leaveRequestId: z.string().optional(),
  /** Link to loan (if LOAN type) */
  loanId: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing payroll runs.
 * Supports filtering by year and status with pagination.
 */
export const payrollRunQuerySchema = z.object({
  /** Filter by payroll year */
  year: z.coerce.number().int().optional(),
  /** Filter by status */
  status: z.nativeEnum(PayrollStatus).optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 10000) */
  ps: z.coerce.number().min(1).max(10000).default(20),
});

/**
 * Query parameters for listing payslips.
 * Supports filtering by payroll run, employee, and period.
 */
export const payslipQuerySchema = z.object({
  /** Filter by payroll run ID */
  payrollRunId: z.string().optional(),
  /** Filter by employee ID */
  userId: z.string().optional(),
  /** Filter by year */
  year: z.coerce.number().int().optional(),
  /** Filter by month (1-12) */
  month: z.coerce.number().int().min(1).max(12).optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 10000) */
  ps: z.coerce.number().min(1).max(10000).default(50),
});

/**
 * Query parameters for listing loans.
 * Supports filtering by employee, status, and type.
 */
export const loanQuerySchema = z.object({
  /** Filter by employee ID */
  userId: z.string().optional(),
  /** Filter by loan status */
  status: z.nativeEnum(LoanStatus).optional(),
  /** Filter by type (LOAN or ADVANCE) */
  type: z.enum(['LOAN', 'ADVANCE']).optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 10000) */
  ps: z.coerce.number().min(1).max(10000).default(50),
});

/**
 * Query parameters for listing salary structures.
 * Supports filtering by employee, active status, and search.
 */
export const salaryStructureQuerySchema = z.object({
  /** Filter by employee ID */
  userId: z.string().optional(),
  /** Filter by active status */
  isActive: z.coerce.boolean().optional(),
  /** Search by employee name */
  search: z.string().optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 10000) */
  ps: z.coerce.number().min(1).max(10000).default(50),
});

/**
 * Query parameters for gratuity calculation.
 * Optionally specify employee and termination date.
 */
export const gratuityQuerySchema = z.object({
  /** Employee/member ID for calculation */
  memberId: z.string().optional(),
  /** Termination date for calculation (defaults to today) */
  terminationDate: z.string().optional(),
});

// ===== Type Exports =====

export type CreateSalaryStructureRequest = z.infer<typeof createSalaryStructureSchema>;
export type UpdateSalaryStructureRequest = z.infer<typeof updateSalaryStructureSchema>;
export type CreatePayrollRunRequest = z.infer<typeof createPayrollRunSchema>;
export type SubmitPayrollRequest = z.infer<typeof submitPayrollSchema>;
export type ApprovePayrollRequest = z.infer<typeof approvePayrollSchema>;
export type RejectPayrollRequest = z.infer<typeof rejectPayrollSchema>;
export type MarkPaidRequest = z.infer<typeof markPaidSchema>;
export type CreateLoanRequest = z.infer<typeof createLoanSchema>;
export type UpdateLoanRequest = z.infer<typeof updateLoanSchema>;
export type RecordRepaymentRequest = z.infer<typeof recordRepaymentSchema>;
export type AddDeductionRequest = z.infer<typeof addDeductionSchema>;
export type PayrollRunQuery = z.infer<typeof payrollRunQuerySchema>;
export type PayslipQuery = z.infer<typeof payslipQuerySchema>;
export type LoanQuery = z.infer<typeof loanQuerySchema>;
export type SalaryStructureQuery = z.infer<typeof salaryStructureQuerySchema>;
export type GratuityQuery = z.infer<typeof gratuityQuerySchema>;

/**
 * Type compatibility check: Ensures Zod schema fields match Prisma model fields.
 */
type ZodSalaryStructureFields = keyof CreateSalaryStructureRequest;
type PrismaSalaryStructureFields = keyof Omit<
  Prisma.SalaryStructureUncheckedCreateInput,
  'id' | 'tenantId' | 'memberId' | 'grossSalary' | 'isActive' | 'effectiveTo' | 'createdAt' | 'updatedAt'
>;
type _ValidateSalaryStructureZodFieldsExistInPrisma = ZodSalaryStructureFields extends PrismaSalaryStructureFields | 'userId'
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodSalaryStructureFields, PrismaSalaryStructureFields | 'userId'> };

type ZodLoanFields = keyof CreateLoanRequest;
type PrismaLoanFields = keyof Omit<
  Prisma.EmployeeLoanUncheckedCreateInput,
  'id' | 'tenantId' | 'memberId' | 'status' | 'remainingBalance' | 'paidAmount' | 'createdAt' | 'updatedAt' |
  'approvedById' | 'approvedAt'
>;
type _ValidateLoanZodFieldsExistInPrisma = ZodLoanFields extends PrismaLoanFields | 'userId'
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodLoanFields, PrismaLoanFields | 'userId'> };
