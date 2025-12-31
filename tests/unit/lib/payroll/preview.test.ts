/**
 * @file preview.test.ts
 * @description Unit tests for payroll preview calculations
 * @module tests/unit/lib/payroll
 *
 * Tests cover:
 * - Gross salary calculation (basic + allowances)
 * - Loan deduction calculations
 * - Leave deduction calculations
 * - Net salary calculations
 * - Aggregated totals
 */

import { LoanStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    salaryStructure: {
      findMany: jest.fn(),
    },
    employeeLoan: {
      findMany: jest.fn(),
    },
    leaveRequest: {
      findMany: jest.fn(),
    },
  },
}));

// Mock the leave-deduction module
jest.mock('@/lib/domains/hr/payroll/leave-deduction', () => ({
  calculateUnpaidLeaveDeductions: jest.fn(),
}));

import { prisma } from '@/lib/core/prisma';
import { calculatePayrollPreview } from '@/lib/domains/hr/payroll/preview';
import { calculateUnpaidLeaveDeductions } from '@/lib/domains/hr/payroll/leave-deduction';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCalculateUnpaidLeaveDeductions = calculateUnpaidLeaveDeductions as jest.MockedFunction<typeof calculateUnpaidLeaveDeductions>;

describe('Payroll Preview', () => {
  const tenantId = 'tenant-123';
  const year = 2024;
  const month = 1; // January
  const periodEnd = new Date(2024, 0, 31); // Jan 31, 2024

  beforeEach(() => {
    jest.clearAllMocks();
    mockCalculateUnpaidLeaveDeductions.mockResolvedValue([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMPTY STATE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Empty state', () => {
    it('should return empty preview when no employees have salary structures', async () => {
      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      expect(result.employees).toHaveLength(0);
      expect(result.totalEmployees).toBe(0);
      expect(result.totalGross).toBe(0);
      expect(result.totalNet).toBe(0);
      expect(result.totalDeductions).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SINGLE EMPLOYEE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Single employee calculations', () => {
    const mockSalaryStructure = {
      id: 'salary-1',
      userId: 'user-1',
      tenantId,
      isActive: true,
      basicSalary: new Decimal(10000),
      housingAllowance: new Decimal(3000),
      transportAllowance: new Decimal(1000),
      foodAllowance: new Decimal(500),
      phoneAllowance: new Decimal(200),
      otherAllowances: new Decimal(300),
      grossSalary: new Decimal(15000),
      user: {
        id: 'user-1',
        name: 'John Doe',
        hrProfile: {
          employeeId: 'EMP-001',
          designation: 'Software Engineer',
        },
      },
    };

    it('should calculate gross salary from all allowances', async () => {
      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      expect(result.employees).toHaveLength(1);
      const employee = result.employees[0];
      expect(employee.basicSalary).toBe(10000);
      expect(employee.housingAllowance).toBe(3000);
      expect(employee.transportAllowance).toBe(1000);
      expect(employee.foodAllowance).toBe(500);
      expect(employee.phoneAllowance).toBe(200);
      expect(employee.otherAllowances).toBe(300);
      expect(employee.grossSalary).toBe(15000);
    });

    it('should calculate net salary equal to gross when no deductions', async () => {
      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.netSalary).toBe(15000);
      expect(employee.totalDeductions).toBe(0);
      expect(employee.loanDeductions).toHaveLength(0);
      expect(employee.leaveDeductions).toHaveLength(0);
    });

    it('should include employee identification details', async () => {
      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.userId).toBe('user-1');
      expect(employee.userName).toBe('John Doe');
      expect(employee.employeeId).toBe('EMP-001');
      expect(employee.designation).toBe('Software Engineer');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOAN DEDUCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Loan deductions', () => {
    const mockSalaryStructure = {
      id: 'salary-1',
      userId: 'user-1',
      tenantId,
      isActive: true,
      basicSalary: new Decimal(10000),
      housingAllowance: new Decimal(0),
      transportAllowance: new Decimal(0),
      foodAllowance: new Decimal(0),
      phoneAllowance: new Decimal(0),
      otherAllowances: new Decimal(0),
      grossSalary: new Decimal(10000),
      user: {
        id: 'user-1',
        name: 'Jane Doe',
        hrProfile: null,
      },
    };

    it('should deduct active loan from salary', async () => {
      const mockLoan = {
        id: 'loan-1',
        loanNumber: 'LOAN-001',
        userId: 'user-1',
        tenantId,
        type: 'PERSONAL',
        description: 'Personal Loan',
        status: LoanStatus.ACTIVE,
        monthlyDeduction: new Decimal(2000),
        remainingAmount: new Decimal(10000),
        startDate: new Date(2023, 0, 1),
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([mockLoan]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.loanDeductions).toHaveLength(1);
      expect(employee.loanDeductions[0].loanId).toBe('loan-1');
      expect(employee.loanDeductions[0].deductionAmount).toBe(2000);
      expect(employee.totalDeductions).toBe(2000);
      expect(employee.netSalary).toBe(8000); // 10000 - 2000
    });

    it('should cap loan deduction at remaining amount', async () => {
      const mockLoan = {
        id: 'loan-1',
        loanNumber: 'LOAN-001',
        userId: 'user-1',
        tenantId,
        type: 'ADVANCE',
        description: 'Salary Advance',
        status: LoanStatus.ACTIVE,
        monthlyDeduction: new Decimal(2000),
        remainingAmount: new Decimal(500), // Less than monthly deduction
        startDate: new Date(2023, 0, 1),
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([mockLoan]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.loanDeductions[0].deductionAmount).toBe(500); // Capped at remaining
      expect(employee.loanDeductions[0].monthlyDeduction).toBe(2000);
      expect(employee.loanDeductions[0].remainingAmount).toBe(500);
      expect(employee.netSalary).toBe(9500); // 10000 - 500
    });

    it('should handle multiple loans for same employee', async () => {
      const mockLoans = [
        {
          id: 'loan-1',
          loanNumber: 'LOAN-001',
          userId: 'user-1',
          tenantId,
          type: 'PERSONAL',
          description: 'Personal Loan',
          status: LoanStatus.ACTIVE,
          monthlyDeduction: new Decimal(1000),
          remainingAmount: new Decimal(5000),
          startDate: new Date(2023, 0, 1),
        },
        {
          id: 'loan-2',
          loanNumber: 'LOAN-002',
          userId: 'user-1',
          tenantId,
          type: 'ADVANCE',
          description: 'Advance',
          status: LoanStatus.ACTIVE,
          monthlyDeduction: new Decimal(500),
          remainingAmount: new Decimal(2000),
          startDate: new Date(2023, 6, 1),
        },
      ];

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue(mockLoans);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.loanDeductions).toHaveLength(2);
      expect(employee.totalDeductions).toBe(1500); // 1000 + 500
      expect(employee.netSalary).toBe(8500); // 10000 - 1500
    });

    it('should not deduct loans that start after period end', async () => {
      const mockLoan = {
        id: 'loan-1',
        loanNumber: 'LOAN-001',
        userId: 'user-1',
        tenantId,
        type: 'PERSONAL',
        description: 'Future Loan',
        status: LoanStatus.ACTIVE,
        monthlyDeduction: new Decimal(2000),
        remainingAmount: new Decimal(10000),
        startDate: new Date(2024, 5, 1), // June 2024 - after January period
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]); // Query should filter this out

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.loanDeductions).toHaveLength(0);
      expect(employee.netSalary).toBe(10000);
    });

    it('should skip loans with zero remaining amount', async () => {
      const mockLoan = {
        id: 'loan-1',
        loanNumber: 'LOAN-001',
        userId: 'user-1',
        tenantId,
        type: 'PERSONAL',
        description: 'Paid Off Loan',
        status: LoanStatus.ACTIVE,
        monthlyDeduction: new Decimal(2000),
        remainingAmount: new Decimal(0), // Fully paid
        startDate: new Date(2023, 0, 1),
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([mockLoan]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.loanDeductions).toHaveLength(0); // No deduction for 0 remaining
      expect(employee.netSalary).toBe(10000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEAVE DEDUCTION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Leave deductions', () => {
    const mockSalaryStructure = {
      id: 'salary-1',
      userId: 'user-1',
      tenantId,
      isActive: true,
      basicSalary: new Decimal(9000),
      housingAllowance: new Decimal(3000),
      transportAllowance: new Decimal(0),
      foodAllowance: new Decimal(0),
      phoneAllowance: new Decimal(0),
      otherAllowances: new Decimal(0),
      grossSalary: new Decimal(12000),
      user: {
        id: 'user-1',
        name: 'Test User',
        hrProfile: null,
      },
    };

    it('should deduct unpaid leave from salary', async () => {
      const unpaidLeaveDeduction = {
        leaveRequestId: 'leave-1',
        requestNumber: 'LR-001',
        leaveTypeName: 'Leave Without Pay',
        startDate: new Date(2024, 0, 15),
        endDate: new Date(2024, 0, 16),
        totalDays: 2,
        dailyRate: 400, // 12000 / 30
        deductionAmount: 800, // 2 days * 400
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);
      mockCalculateUnpaidLeaveDeductions.mockResolvedValue([unpaidLeaveDeduction]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.leaveDeductions).toHaveLength(1);
      expect(employee.leaveDeductions[0].deductionAmount).toBe(800);
      expect(employee.totalDeductions).toBe(800);
      expect(employee.netSalary).toBe(11200); // 12000 - 800
    });

    it('should handle half-day leave deductions', async () => {
      const halfDayLeave = {
        leaveRequestId: 'leave-1',
        requestNumber: 'LR-001',
        leaveTypeName: 'Leave Without Pay',
        startDate: new Date(2024, 0, 15),
        endDate: new Date(2024, 0, 15),
        totalDays: 0.5,
        dailyRate: 400,
        deductionAmount: 200, // 0.5 * 400
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);
      mockCalculateUnpaidLeaveDeductions.mockResolvedValue([halfDayLeave]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.leaveDeductions[0].totalDays).toBe(0.5);
      expect(employee.leaveDeductions[0].deductionAmount).toBe(200);
      expect(employee.netSalary).toBe(11800); // 12000 - 200
    });

    it('should handle leave deduction errors gracefully', async () => {
      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);
      mockCalculateUnpaidLeaveDeductions.mockRejectedValue(new Error('Database error'));

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      // Should continue without leave deductions
      const employee = result.employees[0];
      expect(employee.leaveDeductions).toHaveLength(0);
      expect(employee.netSalary).toBe(12000); // Full salary
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMBINED DEDUCTIONS TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Combined deductions', () => {
    it('should calculate net salary with both loan and leave deductions', async () => {
      const mockSalaryStructure = {
        id: 'salary-1',
        userId: 'user-1',
        tenantId,
        isActive: true,
        basicSalary: new Decimal(9000),
        housingAllowance: new Decimal(0),
        transportAllowance: new Decimal(0),
        foodAllowance: new Decimal(0),
        phoneAllowance: new Decimal(0),
        otherAllowances: new Decimal(0),
        grossSalary: new Decimal(9000),
        user: {
          id: 'user-1',
          name: 'Test User',
          hrProfile: null,
        },
      };

      const mockLoan = {
        id: 'loan-1',
        loanNumber: 'LOAN-001',
        userId: 'user-1',
        tenantId,
        type: 'PERSONAL',
        description: 'Personal Loan',
        status: LoanStatus.ACTIVE,
        monthlyDeduction: new Decimal(1500),
        remainingAmount: new Decimal(10000),
        startDate: new Date(2023, 0, 1),
      };

      const unpaidLeave = {
        leaveRequestId: 'leave-1',
        requestNumber: 'LR-001',
        leaveTypeName: 'LWP',
        startDate: new Date(2024, 0, 10),
        endDate: new Date(2024, 0, 11),
        totalDays: 2,
        dailyRate: 300, // 9000 / 30
        deductionAmount: 600,
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([mockLoan]);
      mockCalculateUnpaidLeaveDeductions.mockResolvedValue([unpaidLeave]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      const employee = result.employees[0];
      expect(employee.grossSalary).toBe(9000);
      expect(employee.loanDeductions[0].deductionAmount).toBe(1500);
      expect(employee.leaveDeductions[0].deductionAmount).toBe(600);
      expect(employee.totalDeductions).toBe(2100); // 1500 + 600
      expect(employee.netSalary).toBe(6900); // 9000 - 2100
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // MULTIPLE EMPLOYEES TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Multiple employees', () => {
    it('should calculate totals across all employees', async () => {
      const mockSalaryStructures = [
        {
          id: 'salary-1',
          userId: 'user-1',
          tenantId,
          isActive: true,
          basicSalary: new Decimal(10000),
          housingAllowance: new Decimal(0),
          transportAllowance: new Decimal(0),
          foodAllowance: new Decimal(0),
          phoneAllowance: new Decimal(0),
          otherAllowances: new Decimal(0),
          grossSalary: new Decimal(10000),
          user: { id: 'user-1', name: 'Alice', hrProfile: null },
        },
        {
          id: 'salary-2',
          userId: 'user-2',
          tenantId,
          isActive: true,
          basicSalary: new Decimal(15000),
          housingAllowance: new Decimal(0),
          transportAllowance: new Decimal(0),
          foodAllowance: new Decimal(0),
          phoneAllowance: new Decimal(0),
          otherAllowances: new Decimal(0),
          grossSalary: new Decimal(15000),
          user: { id: 'user-2', name: 'Bob', hrProfile: null },
        },
      ];

      const mockLoans = [
        {
          id: 'loan-1',
          loanNumber: 'LOAN-001',
          userId: 'user-1',
          tenantId,
          type: 'PERSONAL',
          description: 'Loan 1',
          status: LoanStatus.ACTIVE,
          monthlyDeduction: new Decimal(1000),
          remainingAmount: new Decimal(5000),
          startDate: new Date(2023, 0, 1),
        },
        {
          id: 'loan-2',
          loanNumber: 'LOAN-002',
          userId: 'user-2',
          tenantId,
          type: 'PERSONAL',
          description: 'Loan 2',
          status: LoanStatus.ACTIVE,
          monthlyDeduction: new Decimal(2000),
          remainingAmount: new Decimal(8000),
          startDate: new Date(2023, 0, 1),
        },
      ];

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue(mockSalaryStructures);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue(mockLoans);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      expect(result.totalEmployees).toBe(2);
      expect(result.totalGross).toBe(25000); // 10000 + 15000
      expect(result.totalLoanDeductions).toBe(3000); // 1000 + 2000
      expect(result.totalDeductions).toBe(3000);
      expect(result.totalNet).toBe(22000); // 25000 - 3000
    });

    it('should sort employees alphabetically by name', async () => {
      const mockSalaryStructures = [
        {
          id: 'salary-1',
          userId: 'user-1',
          tenantId,
          isActive: true,
          basicSalary: new Decimal(10000),
          housingAllowance: new Decimal(0),
          transportAllowance: new Decimal(0),
          foodAllowance: new Decimal(0),
          phoneAllowance: new Decimal(0),
          otherAllowances: new Decimal(0),
          grossSalary: new Decimal(10000),
          user: { id: 'user-1', name: 'Zara', hrProfile: null },
        },
        {
          id: 'salary-2',
          userId: 'user-2',
          tenantId,
          isActive: true,
          basicSalary: new Decimal(8000),
          housingAllowance: new Decimal(0),
          transportAllowance: new Decimal(0),
          foodAllowance: new Decimal(0),
          phoneAllowance: new Decimal(0),
          otherAllowances: new Decimal(0),
          grossSalary: new Decimal(8000),
          user: { id: 'user-2', name: 'Alice', hrProfile: null },
        },
      ];

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue(mockSalaryStructures);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      expect(result.employees[0].userName).toBe('Alice');
      expect(result.employees[1].userName).toBe('Zara');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle employee with null name', async () => {
      const mockSalaryStructure = {
        id: 'salary-1',
        userId: 'user-1',
        tenantId,
        isActive: true,
        basicSalary: new Decimal(5000),
        housingAllowance: new Decimal(0),
        transportAllowance: new Decimal(0),
        foodAllowance: new Decimal(0),
        phoneAllowance: new Decimal(0),
        otherAllowances: new Decimal(0),
        grossSalary: new Decimal(5000),
        user: { id: 'user-1', name: null, hrProfile: null },
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      expect(result.employees[0].userName).toBe('Unknown');
    });

    it('should handle employee without HR profile', async () => {
      const mockSalaryStructure = {
        id: 'salary-1',
        userId: 'user-1',
        tenantId,
        isActive: true,
        basicSalary: new Decimal(5000),
        housingAllowance: new Decimal(0),
        transportAllowance: new Decimal(0),
        foodAllowance: new Decimal(0),
        phoneAllowance: new Decimal(0),
        otherAllowances: new Decimal(0),
        grossSalary: new Decimal(5000),
        user: { id: 'user-1', name: 'Test', hrProfile: null },
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      const result = await calculatePayrollPreview(year, month, periodEnd, tenantId);

      expect(result.employees[0].employeeId).toBeNull();
      expect(result.employees[0].designation).toBeNull();
    });

    it('should calculate daily rate correctly (gross / 30)', async () => {
      const mockSalaryStructure = {
        id: 'salary-1',
        userId: 'user-1',
        tenantId,
        isActive: true,
        basicSalary: new Decimal(9000),
        housingAllowance: new Decimal(0),
        transportAllowance: new Decimal(0),
        foodAllowance: new Decimal(0),
        phoneAllowance: new Decimal(0),
        otherAllowances: new Decimal(0),
        grossSalary: new Decimal(9000),
        user: { id: 'user-1', name: 'Test', hrProfile: null },
      };

      (mockPrisma.salaryStructure.findMany as jest.Mock).mockResolvedValue([mockSalaryStructure]);
      (mockPrisma.employeeLoan.findMany as jest.Mock).mockResolvedValue([]);

      await calculatePayrollPreview(year, month, periodEnd, tenantId);

      // Verify daily rate passed to leave deductions calculation
      expect(mockCalculateUnpaidLeaveDeductions).toHaveBeenCalledWith(
        'user-1',
        year,
        month,
        300, // 9000 / 30 = 300 (daily rate)
        tenantId
      );
    });
  });
});
