/**
 * @file payroll-validations.test.ts
 * @description Tests for payroll validation schemas
 */

import { z } from 'zod';

describe('Payroll Validations Tests', () => {
  describe('createSalaryStructureSchema', () => {
    const createSalaryStructureSchema = z.object({
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

    it('should accept valid salary structure', () => {
      const input = {
        userId: 'user-123',
        basicSalary: 10000,
        housingAllowance: 3000,
        transportAllowance: 1500,
        effectiveFrom: '2024-01-01',
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require userId', () => {
      const input = {
        basicSalary: 10000,
        effectiveFrom: '2024-01-01',
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative basic salary', () => {
      const input = {
        userId: 'user-123',
        basicSalary: -1000,
        effectiveFrom: '2024-01-01',
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject too large basic salary', () => {
      const input = {
        userId: 'user-123',
        basicSalary: 9999999999,
        effectiveFrom: '2024-01-01',
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should require effectiveFrom', () => {
      const input = {
        userId: 'user-123',
        basicSalary: 10000,
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should default allowances to 0', () => {
      const input = {
        userId: 'user-123',
        basicSalary: 10000,
        effectiveFrom: '2024-01-01',
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.housingAllowance).toBe(0);
        expect(result.data.transportAllowance).toBe(0);
      }
    });

    it('should accept other allowances details', () => {
      const input = {
        userId: 'user-123',
        basicSalary: 10000,
        effectiveFrom: '2024-01-01',
        otherAllowancesDetails: [
          { name: 'Education', amount: 500 },
          { name: 'Medical', amount: 300 },
        ],
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject notes longer than 500 chars', () => {
      const input = {
        userId: 'user-123',
        basicSalary: 10000,
        effectiveFrom: '2024-01-01',
        notes: 'A'.repeat(501),
      };

      const result = createSalaryStructureSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createPayrollRunSchema', () => {
    const createPayrollRunSchema = z.object({
      year: z.number().int().min(2020).max(2100),
      month: z.number().int().min(1).max(12),
    });

    it('should accept valid payroll run', () => {
      const input = { year: 2024, month: 12 };
      const result = createPayrollRunSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject year before 2020', () => {
      const input = { year: 2019, month: 12 };
      const result = createPayrollRunSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject year after 2100', () => {
      const input = { year: 2101, month: 12 };
      const result = createPayrollRunSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject month 0', () => {
      const input = { year: 2024, month: 0 };
      const result = createPayrollRunSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject month 13', () => {
      const input = { year: 2024, month: 13 };
      const result = createPayrollRunSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should require integer year', () => {
      const input = { year: 2024.5, month: 12 };
      const result = createPayrollRunSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createLoanSchema', () => {
    const createLoanSchema = z.object({
      userId: z.string().min(1, 'User ID is required'),
      type: z.enum(['LOAN', 'ADVANCE']),
      description: z.string().min(1, 'Description is required').max(500),
      principalAmount: z.number().min(1, 'Amount must be greater than 0'),
      monthlyDeduction: z.number().min(1, 'Monthly deduction must be greater than 0'),
      startDate: z.string().min(1, 'Start date is required'),
      installments: z.number().int().min(1, 'At least 1 installment required'),
      notes: z.string().max(500).optional(),
    });

    it('should accept valid loan', () => {
      const input = {
        userId: 'user-123',
        type: 'LOAN',
        description: 'Personal loan',
        principalAmount: 10000,
        monthlyDeduction: 1000,
        startDate: '2024-01-01',
        installments: 10,
      };

      const result = createLoanSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept ADVANCE type', () => {
      const input = {
        userId: 'user-123',
        type: 'ADVANCE',
        description: 'Salary advance',
        principalAmount: 5000,
        monthlyDeduction: 2500,
        startDate: '2024-01-01',
        installments: 2,
      };

      const result = createLoanSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const input = {
        userId: 'user-123',
        type: 'INVALID',
        description: 'Some loan',
        principalAmount: 10000,
        monthlyDeduction: 1000,
        startDate: '2024-01-01',
        installments: 10,
      };

      const result = createLoanSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject 0 principal amount', () => {
      const input = {
        userId: 'user-123',
        type: 'LOAN',
        description: 'Personal loan',
        principalAmount: 0,
        monthlyDeduction: 1000,
        startDate: '2024-01-01',
        installments: 10,
      };

      const result = createLoanSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject 0 installments', () => {
      const input = {
        userId: 'user-123',
        type: 'LOAN',
        description: 'Personal loan',
        principalAmount: 10000,
        monthlyDeduction: 1000,
        startDate: '2024-01-01',
        installments: 0,
      };

      const result = createLoanSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('recordRepaymentSchema', () => {
    const recordRepaymentSchema = z.object({
      amount: z.number().min(0.01, 'Amount must be greater than 0'),
      paymentMethod: z.enum(['SALARY_DEDUCTION', 'CASH', 'BANK_TRANSFER']),
      paymentDate: z.string().min(1, 'Payment date is required'),
      reference: z.string().max(100).optional(),
      notes: z.string().max(500).optional(),
    });

    it('should accept valid repayment', () => {
      const input = {
        amount: 1000,
        paymentMethod: 'SALARY_DEDUCTION',
        paymentDate: '2024-01-31',
      };

      const result = recordRepaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept CASH payment method', () => {
      const input = {
        amount: 1000,
        paymentMethod: 'CASH',
        paymentDate: '2024-01-31',
      };

      const result = recordRepaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept BANK_TRANSFER payment method', () => {
      const input = {
        amount: 1000,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2024-01-31',
        reference: 'TRX-123456',
      };

      const result = recordRepaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject 0 amount', () => {
      const input = {
        amount: 0,
        paymentMethod: 'CASH',
        paymentDate: '2024-01-31',
      };

      const result = recordRepaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid payment method', () => {
      const input = {
        amount: 1000,
        paymentMethod: 'CHECK',
        paymentDate: '2024-01-31',
      };

      const result = recordRepaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('addDeductionSchema', () => {
    const DeductionType = {
      LOAN_REPAYMENT: 'LOAN_REPAYMENT',
      UNPAID_LEAVE: 'UNPAID_LEAVE',
      ADVANCE_RECOVERY: 'ADVANCE_RECOVERY',
      TAX: 'TAX',
      SOCIAL_INSURANCE: 'SOCIAL_INSURANCE',
      OTHER: 'OTHER',
    } as const;

    const addDeductionSchema = z.object({
      type: z.nativeEnum(DeductionType),
      description: z.string().min(1, 'Description is required').max(200),
      amount: z.number().min(0.01, 'Amount must be greater than 0'),
      leaveRequestId: z.string().optional(),
      loanId: z.string().optional(),
    });

    it('should accept valid deduction', () => {
      const input = {
        type: 'UNPAID_LEAVE',
        description: 'Unpaid leave deduction for January',
        amount: 500,
      };

      const result = addDeductionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept loan repayment with loanId', () => {
      const input = {
        type: 'LOAN_REPAYMENT',
        description: 'Monthly loan repayment',
        amount: 1000,
        loanId: 'loan-123',
      };

      const result = addDeductionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept unpaid leave with leaveRequestId', () => {
      const input = {
        type: 'UNPAID_LEAVE',
        description: 'Unpaid leave',
        amount: 500,
        leaveRequestId: 'leave-123',
      };

      const result = addDeductionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid deduction type', () => {
      const input = {
        type: 'INVALID_TYPE',
        description: 'Some deduction',
        amount: 100,
      };

      const result = addDeductionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject description longer than 200 chars', () => {
      const input = {
        type: 'OTHER',
        description: 'A'.repeat(201),
        amount: 100,
      };

      const result = addDeductionSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('Payroll Query Schemas', () => {
    describe('payrollRunQuerySchema', () => {
      const payrollRunQuerySchema = z.object({
        year: z.coerce.number().int().optional(),
        status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PROCESSED', 'PAID', 'CANCELLED']).optional(),
        p: z.coerce.number().min(1).default(1),
        ps: z.coerce.number().min(1).max(100).default(20),
      });

      it('should accept empty query', () => {
        const result = payrollRunQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(1);
          expect(result.data.ps).toBe(20);
        }
      });

      it('should coerce string year to number', () => {
        const result = payrollRunQuerySchema.safeParse({ year: '2024' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.year).toBe(2024);
        }
      });

      it('should accept valid status', () => {
        const result = payrollRunQuerySchema.safeParse({ status: 'APPROVED' });
        expect(result.success).toBe(true);
      });

      it('should reject page size over 100', () => {
        const result = payrollRunQuerySchema.safeParse({ ps: 101 });
        expect(result.success).toBe(false);
      });
    });

    describe('payslipQuerySchema', () => {
      const payslipQuerySchema = z.object({
        payrollRunId: z.string().optional(),
        userId: z.string().optional(),
        year: z.coerce.number().int().optional(),
        month: z.coerce.number().int().min(1).max(12).optional(),
        p: z.coerce.number().min(1).default(1),
        ps: z.coerce.number().min(1).max(100).default(50),
      });

      it('should accept valid query', () => {
        const result = payslipQuerySchema.safeParse({
          payrollRunId: 'run-123',
          year: 2024,
          month: 12,
        });
        expect(result.success).toBe(true);
      });

      it('should reject month 0', () => {
        const result = payslipQuerySchema.safeParse({ month: 0 });
        expect(result.success).toBe(false);
      });

      it('should reject month 13', () => {
        const result = payslipQuerySchema.safeParse({ month: 13 });
        expect(result.success).toBe(false);
      });

      it('should default page size to 50', () => {
        const result = payslipQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ps).toBe(50);
        }
      });
    });

    describe('loanQuerySchema', () => {
      const loanQuerySchema = z.object({
        userId: z.string().optional(),
        status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'WRITTEN_OFF']).optional(),
        type: z.enum(['LOAN', 'ADVANCE']).optional(),
        p: z.coerce.number().min(1).default(1),
        ps: z.coerce.number().min(1).max(100).default(50),
      });

      it('should accept valid query', () => {
        const result = loanQuerySchema.safeParse({
          status: 'ACTIVE',
          type: 'LOAN',
        });
        expect(result.success).toBe(true);
      });

      it('should accept ADVANCE type', () => {
        const result = loanQuerySchema.safeParse({ type: 'ADVANCE' });
        expect(result.success).toBe(true);
      });

      it('should reject invalid status', () => {
        const result = loanQuerySchema.safeParse({ status: 'INVALID' });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Approval Schemas', () => {
    describe('submitPayrollSchema', () => {
      const submitPayrollSchema = z.object({
        notes: z.string().max(500).optional(),
      });

      it('should accept empty submission', () => {
        const result = submitPayrollSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should accept notes', () => {
        const result = submitPayrollSchema.safeParse({ notes: 'Ready for approval' });
        expect(result.success).toBe(true);
      });

      it('should reject notes over 500 chars', () => {
        const result = submitPayrollSchema.safeParse({ notes: 'A'.repeat(501) });
        expect(result.success).toBe(false);
      });
    });

    describe('approvePayrollSchema', () => {
      const approvePayrollSchema = z.object({
        notes: z.string().max(500).optional(),
      });

      it('should accept empty approval', () => {
        const result = approvePayrollSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('rejectPayrollSchema', () => {
      const rejectPayrollSchema = z.object({
        reason: z.string().min(1, 'Rejection reason is required').max(500),
      });

      it('should require reason', () => {
        const result = rejectPayrollSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should accept valid reason', () => {
        const result = rejectPayrollSchema.safeParse({ reason: 'Missing overtime calculations' });
        expect(result.success).toBe(true);
      });

      it('should reject empty reason', () => {
        const result = rejectPayrollSchema.safeParse({ reason: '' });
        expect(result.success).toBe(false);
      });
    });

    describe('markPaidSchema', () => {
      const markPaidSchema = z.object({
        paymentReference: z.string().max(100).optional(),
        notes: z.string().max(500).optional(),
      });

      it('should accept empty mark paid', () => {
        const result = markPaidSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should accept payment reference', () => {
        const result = markPaidSchema.safeParse({ paymentReference: 'WIRE-20241231-001' });
        expect(result.success).toBe(true);
      });

      it('should reject reference over 100 chars', () => {
        const result = markPaidSchema.safeParse({ paymentReference: 'A'.repeat(101) });
        expect(result.success).toBe(false);
      });
    });
  });
});
