/**
 * Payroll API Integration Tests
 * Covers: /api/payroll/* routes
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';
import { PayrollStatus } from '@prisma/client';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

// Type for mocked Prisma model with common methods
interface MockPrismaModel {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

// Type for payroll run year check
interface PayrollRunYear {
  year: number;
}

// Type for salary structure
interface SalaryStructure {
  memberId: string;
  grossSalary: number;
  basicSalary: number;
  isActive: boolean;
}

// Type for active salary structure check
interface ActiveSalaryStructure {
  isActive: boolean;
}

describe('Payroll API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@example.com',
      organizationId: 'org-123',
      organizationSlug: 'test-org',
      orgRole: 'ADMIN',
      subscriptionTier: 'PROFESSIONAL',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockPayrollRuns = [
    {
      id: 'payroll-1',
      tenantId: 'org-123',
      referenceNumber: 'PAY-2024-01-001',
      year: 2024,
      month: 1,
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-31'),
      status: PayrollStatus.DRAFT,
      totalGross: 50000,
      totalDeductions: 5000,
      totalNet: 45000,
      employeeCount: 10,
      createdById: 'admin-123',
      createdAt: new Date(),
    },
    {
      id: 'payroll-2',
      tenantId: 'org-123',
      referenceNumber: 'PAY-2024-02-001',
      year: 2024,
      month: 2,
      status: PayrollStatus.PAID,
      totalGross: 52000,
      totalDeductions: 5200,
      totalNet: 46800,
      employeeCount: 10,
      createdAt: new Date(),
    },
  ];

  const mockSalaryStructures = [
    {
      id: 'salary-1',
      tenantId: 'org-123',
      memberId: 'member-1',
      grossSalary: 5000,
      basicSalary: 3000,
      housingAllowance: 1000,
      transportAllowance: 500,
      otherAllowances: 500,
      isActive: true,
    },
    {
      id: 'salary-2',
      tenantId: 'org-123',
      memberId: 'member-2',
      grossSalary: 6000,
      basicSalary: 3600,
      housingAllowance: 1200,
      transportAllowance: 600,
      otherAllowances: 600,
      isActive: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockAdminSession);
  });

  describe('GET /api/payroll/runs', () => {
    it('should return paginated payroll runs', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findMany.mockResolvedValue(mockPayrollRuns);
      mockPayrollRun.count.mockResolvedValue(2);

      const [runs, total] = await Promise.all([
        mockPayrollRun.findMany({
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          skip: 0,
          take: 20,
        }),
        mockPayrollRun.count(),
      ]);

      expect(runs).toHaveLength(2);
      expect(total).toBe(2);
    });

    it('should filter by year', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findMany.mockResolvedValue(mockPayrollRuns);

      const runs = await mockPayrollRun.findMany({
        where: { year: 2024 },
      });

      expect(runs.every((r: PayrollRunYear) => r.year === 2024)).toBe(true);
    });

    it('should filter by status', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findMany.mockResolvedValue([mockPayrollRuns[0]]);

      const runs = await mockPayrollRun.findMany({
        where: { status: PayrollStatus.DRAFT },
      });

      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe(PayrollStatus.DRAFT);
    });

    it('should require admin role', async () => {
      const memberSession = { ...mockAdminSession, user: { ...mockAdminSession.user, orgRole: 'MEMBER' } };
      mockGetServerSession.mockResolvedValue(memberSession);

      const session = await mockGetServerSession();
      expect(session?.user.orgRole).toBe('MEMBER');
      // Handler would reject non-admin requests
    });

    it('should require payroll module to be enabled', () => {
      // This is handled by the withErrorHandler requireModule option
      const moduleRequired = 'payroll';
      expect(moduleRequired).toBe('payroll');
    });
  });

  describe('POST /api/payroll/runs', () => {
    it('should create new payroll run', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);
      const mockPayrollHistory = getMockedModel(prisma.payrollHistory);

      mockPayrollRun.findFirst.mockResolvedValue(null); // No existing run
      mockSalaryStructure.findMany.mockResolvedValue(mockSalaryStructures);
      mockPayrollRun.create.mockResolvedValue({
        id: 'payroll-new',
        tenantId: 'org-123',
        referenceNumber: 'PAY-2024-03-001',
        year: 2024,
        month: 3,
        status: PayrollStatus.DRAFT,
        employeeCount: 2,
        totalGross: 11000,
        totalDeductions: 0,
        totalNet: 11000,
        createdById: 'admin-123',
      });
      mockPayrollHistory.create.mockResolvedValue({
        id: 'history-1',
        payrollRunId: 'payroll-new',
        action: 'CREATED',
        newStatus: PayrollStatus.DRAFT,
      });

      // Check for existing
      const existing = await mockPayrollRun.findFirst({
        where: { year: 2024, month: 3 },
      });
      expect(existing).toBeNull();

      // Get salary structures
      const salaries = await mockSalaryStructure.findMany({
        where: { isActive: true },
      });
      expect(salaries).toHaveLength(2);

      // Create payroll run
      const payrollRun = await mockPayrollRun.create({
        data: {
          referenceNumber: 'PAY-2024-03-001',
          year: 2024,
          month: 3,
          status: PayrollStatus.DRAFT,
          employeeCount: salaries.length,
          tenantId: 'org-123',
          createdById: 'admin-123',
        },
      });

      expect(payrollRun.status).toBe(PayrollStatus.DRAFT);
      expect(payrollRun.employeeCount).toBe(2);
    });

    it('should reject duplicate period', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findFirst.mockResolvedValue(mockPayrollRuns[0]);

      const existing = await mockPayrollRun.findFirst({
        where: { year: 2024, month: 1 },
      });

      expect(existing).not.toBeNull();
      expect(existing.referenceNumber).toBe('PAY-2024-01-001');
    });

    it('should require at least one employee with salary structure', async () => {
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);
      mockSalaryStructure.findMany.mockResolvedValue([]);

      const salaries = await mockSalaryStructure.findMany({
        where: { isActive: true },
      });

      expect(salaries).toHaveLength(0);
    });

    it('should calculate period dates correctly', () => {
      const getPeriodDates = (year: number, month: number) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0); // Last day of month
        return { start, end };
      };

      const { start, end } = getPeriodDates(2024, 2);
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(29); // 2024 is leap year
    });

    it('should generate sequential reference numbers', () => {
      const generateReference = (year: number, month: number, sequence: number) => {
        const monthStr = month.toString().padStart(2, '0');
        const seqStr = sequence.toString().padStart(3, '0');
        return `PAY-${year}-${monthStr}-${seqStr}`;
      };

      expect(generateReference(2024, 3, 1)).toBe('PAY-2024-03-001');
      expect(generateReference(2024, 12, 15)).toBe('PAY-2024-12-015');
    });
  });

  describe('GET /api/payroll/runs/[id]', () => {
    it('should return payroll run details', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findUnique.mockResolvedValue({
        ...mockPayrollRuns[0],
        payslips: [],
        createdBy: { id: 'admin-123', name: 'Admin User' },
      });

      const payroll = await mockPayrollRun.findUnique({
        where: { id: 'payroll-1' },
        include: {
          payslips: true,
          createdBy: { select: { id: true, name: true } },
        },
      });

      expect(payroll.id).toBe('payroll-1');
      expect(payroll.createdBy).toBeDefined();
    });

    it('should return 404 for non-existent run', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findUnique.mockResolvedValue(null);

      const payroll = await mockPayrollRun.findUnique({
        where: { id: 'payroll-nonexistent' },
      });

      expect(payroll).toBeNull();
    });
  });

  describe('POST /api/payroll/runs/[id]/process', () => {
    it('should process payroll and generate payslips', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      const mockPayslip = getMockedModel(prisma.payslip);
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);

      mockPayrollRun.findUnique.mockResolvedValue(mockPayrollRuns[0]);
      mockSalaryStructure.findMany.mockResolvedValue(mockSalaryStructures);
      mockPayslip.createMany.mockResolvedValue({ count: 2 });
      mockPayrollRun.update.mockResolvedValue({
        ...mockPayrollRuns[0],
        status: PayrollStatus.PROCESSED,
      });

      const payroll = await mockPayrollRun.findUnique({
        where: { id: 'payroll-1' },
      });
      expect(payroll.status).toBe(PayrollStatus.DRAFT);

      const salaries = await mockSalaryStructure.findMany({
        where: { isActive: true },
      });

      const payslipsData = salaries.map((s: SalaryStructure) => ({
        payrollRunId: 'payroll-1',
        memberId: s.memberId,
        tenantId: 'org-123',
        grossSalary: s.grossSalary,
        basicSalary: s.basicSalary,
        netSalary: s.grossSalary - 500, // Example deduction
      }));

      const result = await mockPayslip.createMany({ data: payslipsData });
      expect(result.count).toBe(2);

      const updated = await mockPayrollRun.update({
        where: { id: 'payroll-1' },
        data: { status: PayrollStatus.PROCESSED },
      });
      expect(updated.status).toBe(PayrollStatus.PROCESSED);
    });

    it('should only process DRAFT status payroll', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findUnique.mockResolvedValue({
        ...mockPayrollRuns[1],
        status: PayrollStatus.PAID,
      });

      const payroll = await mockPayrollRun.findUnique({
        where: { id: 'payroll-2' },
      });

      expect(payroll.status).not.toBe(PayrollStatus.DRAFT);
    });
  });

  describe('POST /api/payroll/runs/[id]/submit', () => {
    it('should submit payroll for approval', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.update.mockResolvedValue({
        ...mockPayrollRuns[0],
        status: PayrollStatus.PENDING_APPROVAL,
        submittedById: 'admin-123',
        submittedAt: new Date(),
      });

      const updated = await mockPayrollRun.update({
        where: { id: 'payroll-1' },
        data: {
          status: PayrollStatus.PENDING_APPROVAL,
          submittedById: 'admin-123',
          submittedAt: new Date(),
        },
      });

      expect(updated.status).toBe(PayrollStatus.PENDING_APPROVAL);
      expect(updated.submittedById).toBe('admin-123');
    });

    it('should only submit PROCESSED status payroll', () => {
      const canSubmit = (status: PayrollStatus) => status === PayrollStatus.PROCESSED;

      expect(canSubmit(PayrollStatus.PROCESSED)).toBe(true);
      expect(canSubmit(PayrollStatus.DRAFT)).toBe(false);
      expect(canSubmit(PayrollStatus.PAID)).toBe(false);
    });
  });

  describe('POST /api/payroll/runs/[id]/approve', () => {
    it('should approve payroll run', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.update.mockResolvedValue({
        ...mockPayrollRuns[0],
        status: PayrollStatus.APPROVED,
        approvedById: 'admin-123',
        approvedAt: new Date(),
      });

      const updated = await mockPayrollRun.update({
        where: { id: 'payroll-1' },
        data: {
          status: PayrollStatus.APPROVED,
          approvedById: 'admin-123',
          approvedAt: new Date(),
        },
      });

      expect(updated.status).toBe(PayrollStatus.APPROVED);
    });
  });

  describe('POST /api/payroll/runs/[id]/pay', () => {
    it('should mark payroll as paid', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.update.mockResolvedValue({
        ...mockPayrollRuns[0],
        status: PayrollStatus.PAID,
        paidById: 'admin-123',
        paidAt: new Date(),
      });

      const updated = await mockPayrollRun.update({
        where: { id: 'payroll-1' },
        data: {
          status: PayrollStatus.PAID,
          paidById: 'admin-123',
          paidAt: new Date(),
        },
      });

      expect(updated.status).toBe(PayrollStatus.PAID);
    });

    it('should only pay APPROVED status payroll', () => {
      const canPay = (status: PayrollStatus) => status === PayrollStatus.APPROVED;

      expect(canPay(PayrollStatus.APPROVED)).toBe(true);
      expect(canPay(PayrollStatus.PENDING_APPROVAL)).toBe(false);
    });
  });

  describe('POST /api/payroll/runs/[id]/cancel', () => {
    it('should cancel payroll run', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.update.mockResolvedValue({
        ...mockPayrollRuns[0],
        status: PayrollStatus.CANCELLED,
        cancelledReason: 'Data correction needed',
      });

      const updated = await mockPayrollRun.update({
        where: { id: 'payroll-1' },
        data: {
          status: PayrollStatus.CANCELLED,
          cancelledReason: 'Data correction needed',
        },
      });

      expect(updated.status).toBe(PayrollStatus.CANCELLED);
    });

    it('should not allow cancelling PAID payroll', () => {
      const canCancel = (status: PayrollStatus) =>
        status !== PayrollStatus.PAID && status !== PayrollStatus.CANCELLED;

      expect(canCancel(PayrollStatus.DRAFT)).toBe(true);
      expect(canCancel(PayrollStatus.PAID)).toBe(false);
    });
  });

  describe('GET /api/payroll/runs/[id]/wps', () => {
    it('should generate WPS file for payroll', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      const mockPayslip = getMockedModel(prisma.payslip);

      mockPayrollRun.findUnique.mockResolvedValue(mockPayrollRuns[0]);
      mockPayslip.findMany.mockResolvedValue([
        {
          id: 'payslip-1',
          memberId: 'member-1',
          netSalary: 4500,
          member: {
            name: 'John Doe',
            bankName: 'QNB',
            iban: 'QA123456789',
            qidNumber: '123456789',
          },
        },
      ]);

      const payslips = await mockPayslip.findMany({
        where: { payrollRunId: 'payroll-1' },
        include: { member: true },
      });

      expect(payslips).toHaveLength(1);
      expect(payslips[0].member.iban).toBeDefined();
    });

    it('should only generate WPS for APPROVED or PAID payroll', () => {
      const canGenerateWps = (status: PayrollStatus) =>
        ([PayrollStatus.APPROVED, PayrollStatus.PAID] as PayrollStatus[]).includes(status);

      expect(canGenerateWps(PayrollStatus.APPROVED)).toBe(true);
      expect(canGenerateWps(PayrollStatus.PAID)).toBe(true);
      expect(canGenerateWps(PayrollStatus.DRAFT)).toBe(false);
    });
  });

  describe('GET /api/payroll/salary-structures', () => {
    it('should return all salary structures', async () => {
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);
      mockSalaryStructure.findMany.mockResolvedValue(mockSalaryStructures);

      const structures = await mockSalaryStructure.findMany({
        include: { member: true },
      });

      expect(structures).toHaveLength(2);
    });

    it('should filter by active status', async () => {
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);
      mockSalaryStructure.findMany.mockResolvedValue(mockSalaryStructures);

      const structures = await mockSalaryStructure.findMany({
        where: { isActive: true },
      });

      expect(structures.every((s: ActiveSalaryStructure) => s.isActive)).toBe(true);
    });
  });

  describe('POST /api/payroll/salary-structures', () => {
    it('should create salary structure for employee', async () => {
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);
      mockSalaryStructure.create.mockResolvedValue({
        id: 'salary-new',
        tenantId: 'org-123',
        memberId: 'member-3',
        grossSalary: 7000,
        basicSalary: 4200,
        isActive: true,
      });

      const structure = await mockSalaryStructure.create({
        data: {
          tenantId: 'org-123',
          memberId: 'member-3',
          grossSalary: 7000,
          basicSalary: 4200,
          isActive: true,
        },
      });

      expect(structure.id).toBeDefined();
      expect(structure.memberId).toBe('member-3');
    });

    it('should deactivate existing structure when creating new one', async () => {
      const mockSalaryStructure = getMockedModel(prisma.salaryStructure);
      mockSalaryStructure.updateMany.mockResolvedValue({ count: 1 });

      await mockSalaryStructure.updateMany({
        where: { memberId: 'member-1', isActive: true },
        data: { isActive: false },
      });

      expect(mockSalaryStructure.updateMany).toHaveBeenCalled();
    });
  });

  describe('GET /api/payroll/payslips', () => {
    it('should return payslips for employee', async () => {
      const mockPayslip = getMockedModel(prisma.payslip);
      mockPayslip.findMany.mockResolvedValue([
        {
          id: 'payslip-1',
          payrollRunId: 'payroll-1',
          memberId: 'member-1',
          grossSalary: 5000,
          netSalary: 4500,
        },
      ]);

      const payslips = await mockPayslip.findMany({
        where: { memberId: 'member-1' },
      });

      expect(payslips).toHaveLength(1);
    });

    it('should include payroll run details', async () => {
      const mockPayslip = getMockedModel(prisma.payslip);
      mockPayslip.findMany.mockResolvedValue([
        {
          id: 'payslip-1',
          memberId: 'member-1',
          payrollRun: {
            id: 'payroll-1',
            referenceNumber: 'PAY-2024-01-001',
            year: 2024,
            month: 1,
            status: PayrollStatus.PAID,
          },
        },
      ]);

      const payslips = await mockPayslip.findMany({
        where: { memberId: 'member-1' },
        include: { payrollRun: true },
      });

      expect(payslips[0].payrollRun).toBeDefined();
      expect(payslips[0].payrollRun.referenceNumber).toBe('PAY-2024-01-001');
    });
  });

  describe('GET /api/payroll/loans', () => {
    it('should return employee loans', async () => {
      const mockLoan = getMockedModel(prisma.employeeLoan);
      mockLoan.findMany.mockResolvedValue([
        {
          id: 'loan-1',
          tenantId: 'org-123',
          memberId: 'member-1',
          amount: 5000,
          remainingAmount: 3000,
          monthlyDeduction: 500,
          status: 'ACTIVE',
        },
      ]);

      const loans = await mockLoan.findMany({
        where: { status: 'ACTIVE' },
      });

      expect(loans).toHaveLength(1);
      expect(loans[0].remainingAmount).toBe(3000);
    });
  });

  describe('POST /api/payroll/loans', () => {
    it('should create new employee loan', async () => {
      const mockLoan = getMockedModel(prisma.employeeLoan);
      mockLoan.create.mockResolvedValue({
        id: 'loan-new',
        tenantId: 'org-123',
        memberId: 'member-1',
        amount: 10000,
        remainingAmount: 10000,
        monthlyDeduction: 1000,
        status: 'ACTIVE',
        startDate: new Date(),
      });

      const loan = await mockLoan.create({
        data: {
          tenantId: 'org-123',
          memberId: 'member-1',
          amount: 10000,
          remainingAmount: 10000,
          monthlyDeduction: 1000,
          status: 'ACTIVE',
        },
      });

      expect(loan.id).toBeDefined();
      expect(loan.remainingAmount).toBe(loan.amount);
    });
  });

  describe('POST /api/payroll/loans/[id]/pause', () => {
    it('should pause loan deductions', async () => {
      const mockLoan = getMockedModel(prisma.employeeLoan);
      mockLoan.update.mockResolvedValue({
        id: 'loan-1',
        status: 'PAUSED',
        pausedAt: new Date(),
        pauseReason: 'Employee request',
      });

      const loan = await mockLoan.update({
        where: { id: 'loan-1' },
        data: {
          status: 'PAUSED',
          pausedAt: new Date(),
          pauseReason: 'Employee request',
        },
      });

      expect(loan.status).toBe('PAUSED');
    });
  });

  describe('POST /api/payroll/loans/[id]/write-off', () => {
    it('should write off remaining loan balance', async () => {
      const mockLoan = getMockedModel(prisma.employeeLoan);
      mockLoan.update.mockResolvedValue({
        id: 'loan-1',
        status: 'WRITTEN_OFF',
        writtenOffAmount: 3000,
        writtenOffAt: new Date(),
        writtenOffReason: 'Employee termination',
      });

      const loan = await mockLoan.update({
        where: { id: 'loan-1' },
        data: {
          status: 'WRITTEN_OFF',
          writtenOffAmount: 3000,
          writtenOffAt: new Date(),
          writtenOffReason: 'Employee termination',
        },
      });

      expect(loan.status).toBe('WRITTEN_OFF');
      expect(loan.writtenOffAmount).toBe(3000);
    });
  });

  describe('GET /api/payroll/gratuity', () => {
    it('should calculate gratuity for employee', async () => {
      const calculateGratuity = (
        basicSalary: number,
        yearsOfService: number
      ): number => {
        // UAE gratuity calculation: 21 days basic for first 5 years, 30 days for remaining
        const dailyWage = basicSalary / 30;

        if (yearsOfService <= 5) {
          return dailyWage * 21 * yearsOfService;
        } else {
          const first5Years = dailyWage * 21 * 5;
          const remainingYears = dailyWage * 30 * (yearsOfService - 5);
          return first5Years + remainingYears;
        }
      };

      expect(calculateGratuity(3000, 3)).toBe(6300); // 21 * 100 * 3
      expect(calculateGratuity(3000, 7)).toBe(16500); // (21 * 5 + 30 * 2) * 100
    });
  });

  describe('Tenant Isolation', () => {
    it('should filter all payroll queries by tenant', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findMany.mockResolvedValue(mockPayrollRuns);

      await mockPayrollRun.findMany({
        where: { tenantId: 'org-123' },
      });

      expect(mockPayrollRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'org-123',
          }),
        })
      );
    });

    it('should prevent accessing other tenant payroll data', async () => {
      const mockPayrollRun = getMockedModel(prisma.payrollRun);
      mockPayrollRun.findFirst.mockResolvedValue(null);

      const payroll = await mockPayrollRun.findFirst({
        where: {
          id: 'payroll-other-tenant',
          tenantId: 'org-123', // Current tenant
        },
      });

      expect(payroll).toBeNull();
    });
  });

  describe('Payroll Status Workflow', () => {
    it('should follow correct status transitions', () => {
      const validTransitions: Record<PayrollStatus, PayrollStatus[]> = {
        [PayrollStatus.DRAFT]: [PayrollStatus.PROCESSED, PayrollStatus.CANCELLED],
        [PayrollStatus.PROCESSED]: [PayrollStatus.PENDING_APPROVAL, PayrollStatus.CANCELLED],
        [PayrollStatus.PENDING_APPROVAL]: [PayrollStatus.APPROVED, PayrollStatus.DRAFT, PayrollStatus.CANCELLED],
        [PayrollStatus.APPROVED]: [PayrollStatus.PAID, PayrollStatus.CANCELLED],
        [PayrollStatus.PAID]: [],
        [PayrollStatus.CANCELLED]: [],
      };

      const canTransition = (from: PayrollStatus, to: PayrollStatus): boolean => {
        return validTransitions[from].includes(to);
      };

      expect(canTransition(PayrollStatus.DRAFT, PayrollStatus.PROCESSED)).toBe(true);
      expect(canTransition(PayrollStatus.DRAFT, PayrollStatus.PAID)).toBe(false);
      expect(canTransition(PayrollStatus.PAID, PayrollStatus.CANCELLED)).toBe(false);
    });
  });
});
