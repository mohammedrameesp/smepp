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
 * This shows expected salaries and deductions before processing
 */
export async function calculatePayrollPreview(
  year: number,
  month: number,
  periodEnd: Date
): Promise<PayrollPreview> {
  // Get all active salary structures
  const salaryStructures = await prisma.salaryStructure.findMany({
    where: { isActive: true },
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

  // Get active loans that should be deducted in this period
  const activeLoans = await prisma.employeeLoan.findMany({
    where: {
      status: LoanStatus.ACTIVE,
      startDate: { lte: periodEnd },
    },
  });

  // Create a map of loans by userId
  const loansByUser = new Map<string, typeof activeLoans>();
  for (const loan of activeLoans) {
    const userLoans = loansByUser.get(loan.userId) || [];
    userLoans.push(loan);
    loansByUser.set(loan.userId, userLoans);
  }

  const employees: EmployeePayrollPreview[] = [];
  let totalGross = 0;
  let totalLoanDeductions = 0;
  let totalLeaveDeductions = 0;

  for (const salary of salaryStructures) {
    const grossSalary = parseDecimal(salary.grossSalary);
    const dailyRate = calculateDailySalary(grossSalary);

    // Calculate loan deductions
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

    // Calculate leave deductions
    let leaveDeductions: UnpaidLeaveDeduction[] = [];
    try {
      leaveDeductions = await calculateUnpaidLeaveDeductions(
        salary.userId,
        year,
        month,
        dailyRate
      );
    } catch (error) {
      console.error('Error calculating leave deductions:', error);
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
