/**
 * @file preview.ts
 * @description Payroll preview calculation - calculates expected salaries and deductions before processing
 * @module domains/hr/payroll
 *
 * PURPOSE:
 * Generates a complete payroll preview before actual processing, showing:
 * - Each employee's salary breakdown (basic + allowances)
 * - Loan deductions (from active employee loans)
 * - Leave deductions (unpaid leave days * daily rate)
 * - Net salary after all deductions
 *
 * BUSINESS RULES:
 * - Only employees with active salary structures are included
 * - Loan deductions are capped at remaining loan balance
 * - Leave deductions apply only to unpaid leave types
 * - All calculations use QAR (Qatari Riyal) as base currency
 *
 * USAGE:
 * Called from the payroll run creation flow to show HR what will be processed.
 * The preview helps catch issues before committing to a payroll run.
 */

import { prisma } from '@/lib/core/prisma';
import { LoanStatus } from '@prisma/client';
import { parseDecimal, calculateDailySalary } from './utils';
import { calculateUnpaidLeaveDeductions, UnpaidLeaveDeduction } from './leave-deduction';

export interface LoanDeductionPreview {
  loanId: string;
  loanNumber: string;
  type: string;
  description: string;
  monthlyDeduction: number;
  remainingAmount: number;
  deductionAmount: number;
}

export interface EmployeePayrollPreview {
  userId: string;
  userName: string;
  employeeId: string | null;
  designation: string | null;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  phoneAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  loanDeductions: LoanDeductionPreview[];
  leaveDeductions: UnpaidLeaveDeduction[];
  totalDeductions: number;
  netSalary: number;
}

export interface PayrollPreview {
  employees: EmployeePayrollPreview[];
  totalEmployees: number;
  totalGross: number;
  totalLoanDeductions: number;
  totalLeaveDeductions: number;
  totalDeductions: number;
  totalNet: number;
}

/**
 * Calculate payroll preview for a given period
 *
 * ALGORITHM:
 * 1. Fetch all employees with active salary structures
 * 2. For each employee:
 *    a. Calculate gross salary (basic + all allowances)
 *    b. Find active loans and calculate deductions
 *    c. Find unpaid leave days and calculate deductions
 *    d. Calculate net = gross - loan deductions - leave deductions
 * 3. Aggregate totals across all employees
 *
 * @param year - Payroll year (e.g., 2024)
 * @param month - Payroll month (1-12)
 * @param periodEnd - End date of the payroll period (for loan eligibility check)
 * @param tenantId - Organization ID for tenant isolation
 * @returns Complete payroll preview with employee breakdowns and totals
 *
 * @example
 * const preview = await calculatePayrollPreview(2024, 1, new Date('2024-01-31'), 'org-123');
 * console.log(`Total payroll: ${preview.totalNet} QAR for ${preview.totalEmployees} employees`);
 */
export async function calculatePayrollPreview(
  year: number,
  month: number,
  periodEnd: Date,
  tenantId: string
): Promise<PayrollPreview> {
  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Fetch employees with active salary structures
  // Only employees with isActive=true salary structures are included
  // ─────────────────────────────────────────────────────────────────────────
  const salaryStructures = await prisma.salaryStructure.findMany({
    where: { isActive: true, tenantId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          hrProfile: {
            select: {
              employeeId: true,
              designation: true,
            },
          },
        },
      },
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Fetch active loans for deduction calculation
  // Loans must be:
  // - Status = ACTIVE (not paid off, paused, or written off)
  // - Start date <= period end (loan disbursement has occurred)
  // ─────────────────────────────────────────────────────────────────────────
  const activeLoans = await prisma.employeeLoan.findMany({
    where: {
      tenantId,
      status: LoanStatus.ACTIVE,
      startDate: { lte: periodEnd },
    },
  });

  // Index loans by userId for O(1) lookup during employee iteration
  const loansByUser = new Map<string, typeof activeLoans>();
  for (const loan of activeLoans) {
    const userLoans = loansByUser.get(loan.userId) || [];
    userLoans.push(loan);
    loansByUser.set(loan.userId, userLoans);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Calculate payroll for each employee
  // ─────────────────────────────────────────────────────────────────────────
  const employees: EmployeePayrollPreview[] = [];
  let totalGross = 0;
  let totalLoanDeductions = 0;
  let totalLeaveDeductions = 0;

  for (const salary of salaryStructures) {
    // Gross salary includes: basic + housing + transport + food + phone + other
    const grossSalary = parseDecimal(salary.grossSalary);
    // Daily rate = gross / 30 days (standard month in Qatar labor law)
    const dailyRate = calculateDailySalary(grossSalary);

    // ─────────────────────────────────────────────────────────────────────
    // LOAN DEDUCTIONS
    // For each active loan, deduct min(monthlyDeduction, remainingAmount)
    // This ensures final payment doesn't exceed remaining balance
    // ─────────────────────────────────────────────────────────────────────
    const userLoans = loansByUser.get(salary.userId) || [];
    const loanDeductions: LoanDeductionPreview[] = [];

    for (const loan of userLoans) {
      const monthlyDeduction = parseDecimal(loan.monthlyDeduction);
      const remaining = parseDecimal(loan.remainingAmount);
      const deductionAmount = Math.min(monthlyDeduction, remaining);

      if (deductionAmount > 0) {
        loanDeductions.push({
          loanId: loan.id,
          loanNumber: loan.loanNumber,
          type: loan.type,
          description: loan.description,
          monthlyDeduction,
          remainingAmount: remaining,
          deductionAmount,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // LEAVE DEDUCTIONS
    // Find approved unpaid leave requests for this month and calculate:
    // deduction = unpaid leave days × daily rate
    // ─────────────────────────────────────────────────────────────────────
    let leaveDeductions: UnpaidLeaveDeduction[] = [];
    try {
      leaveDeductions = await calculateUnpaidLeaveDeductions(
        salary.userId,
        year,
        month,
        dailyRate,
        tenantId
      );
    } catch {
      // Leave deduction calculation failed - continue with empty array
      // Error details are not logged to avoid console pollution in production
    }

    const totalLoanDeductionForEmployee = loanDeductions.reduce((sum, d) => sum + d.deductionAmount, 0);
    const totalLeaveDeductionForEmployee = leaveDeductions.reduce((sum, d) => sum + d.deductionAmount, 0);
    const totalDeductionsForEmployee = totalLoanDeductionForEmployee + totalLeaveDeductionForEmployee;

    employees.push({
      userId: salary.userId,
      userName: salary.user.name || 'Unknown',
      employeeId: salary.user.hrProfile?.employeeId || null,
      designation: salary.user.hrProfile?.designation || null,
      basicSalary: parseDecimal(salary.basicSalary),
      housingAllowance: parseDecimal(salary.housingAllowance),
      transportAllowance: parseDecimal(salary.transportAllowance),
      foodAllowance: parseDecimal(salary.foodAllowance),
      phoneAllowance: parseDecimal(salary.phoneAllowance),
      otherAllowances: parseDecimal(salary.otherAllowances),
      grossSalary,
      loanDeductions,
      leaveDeductions,
      totalDeductions: totalDeductionsForEmployee,
      netSalary: grossSalary - totalDeductionsForEmployee,
    });

    totalGross += grossSalary;
    totalLoanDeductions += totalLoanDeductionForEmployee;
    totalLeaveDeductions += totalLeaveDeductionForEmployee;
  }

  // Sort employees by name
  employees.sort((a, b) => a.userName.localeCompare(b.userName));

  const totalDeductions = totalLoanDeductions + totalLeaveDeductions;

  return {
    employees,
    totalEmployees: employees.length,
    totalGross,
    totalLoanDeductions,
    totalLeaveDeductions,
    totalDeductions,
    totalNet: totalGross - totalDeductions,
  };
}
