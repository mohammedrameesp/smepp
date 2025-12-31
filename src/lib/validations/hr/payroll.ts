/**
 * @file payroll.ts
 * @description Validation schemas for payroll operations including salary structures, payroll runs, loans, and deductions
 * @module validations/hr
 */

import { z } from 'zod';
import { PayrollStatus, LoanStatus, DeductionType } from '@prisma/client';

// ===== Salary Structure Schemas =====

export const createSalaryStructureSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  basicSalary: z.number().min(0, 'Basic salary must be positive').max(999999999, 'Amount too large'),
  housingAllowance: z.number().min(0).default(0),
  transportAllowance: z.number().min(0).default(0),
  foodAllowance: z.number().min(0).default(0),
  phoneAllowance: z.number().min(0).default(0),
  otherAllowances: z.number().min(0).default(0),
  otherAllowancesDetails: z.array(z.object({
    name: z.string().min(1, 'Allowance name is required'),
    amount: z.number().min(0, 'Amount must be positive'),
  })).optional(),
  effectiveFrom: z.string().min(1, 'Effective date is required'),
  notes: z.string().max(500).optional(),
});

export const updateSalaryStructureSchema = createSalaryStructureSchema.partial().omit({ userId: true });

// ===== Payroll Run Schemas =====

export const createPayrollRunSchema = z.object({
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
});

export const submitPayrollSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const approvePayrollSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const rejectPayrollSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

export const markPaidSchema = z.object({
  paymentReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// ===== Loan Schemas =====

export const createLoanSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['LOAN', 'ADVANCE']),
  description: z.string().min(1, 'Description is required').max(500),
  principalAmount: z.number().min(1, 'Amount must be greater than 0'),
  monthlyDeduction: z.number().min(1, 'Monthly deduction must be greater than 0'),
  startDate: z.string().min(1, 'Start date is required'),
  installments: z.number().int().min(1, 'At least 1 installment required'),
  notes: z.string().max(500).optional(),
});

export const updateLoanSchema = z.object({
  monthlyDeduction: z.number().min(1).optional(),
  notes: z.string().max(500).optional(),
});

export const recordRepaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.enum(['SALARY_DEDUCTION', 'CASH', 'BANK_TRANSFER']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

// ===== Payslip Deduction Schema =====

export const addDeductionSchema = z.object({
  type: z.nativeEnum(DeductionType),
  description: z.string().min(1, 'Description is required').max(200),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  leaveRequestId: z.string().optional(),
  loanId: z.string().optional(),
});

// ===== Query Schemas =====

export const payrollRunQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  status: z.nativeEnum(PayrollStatus).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
});

export const payslipQuerySchema = z.object({
  payrollRunId: z.string().optional(),
  userId: z.string().optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
});

export const loanQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.nativeEnum(LoanStatus).optional(),
  type: z.enum(['LOAN', 'ADVANCE']).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
});

export const salaryStructureQuerySchema = z.object({
  userId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
});

export const gratuityQuerySchema = z.object({
  userId: z.string().optional(),
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
