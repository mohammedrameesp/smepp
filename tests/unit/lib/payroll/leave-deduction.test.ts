/**
 * @file leave-deduction.test.ts
 * @description Unit tests for unpaid leave deduction calculations
 * @module tests/unit/lib/payroll
 *
 * Business Rules Tested:
 * - FIN-001: Half-day leave support using stored totalDays
 * - Qatar Labor Law: Uses 30-day month for daily rate calculation
 * - Only APPROVED leave requests are considered
 * - Only unpaid leave types (isPaid=false) trigger deductions
 * - Pro-rata for leaves spanning multiple months
 */

import { LeaveStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    leaveRequest: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';
import {
  calculateUnpaidLeaveDeductions,
  getUnpaidLeaveDaysInPeriod,
  hasUnpaidLeaveInPeriod,
} from '@/lib/domains/hr/payroll/leave-deduction';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Leave Deduction Calculations', () => {
  const tenantId = 'tenant-123';
  const memberId = 'member-1';
  const dailySalary = 500; // 15000 QAR / 30 days
  const year = 2024;
  const month = 1; // January

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALCULATE UNPAID LEAVE DEDUCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateUnpaidLeaveDeductions', () => {
    describe('Basic deduction calculations', () => {
      it('should return empty array when no unpaid leaves', async () => {
        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toEqual([]);
      });

      it('should calculate deduction for single day leave', async () => {
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2024, 0, 15), // Jan 15
          endDate: new Date(2024, 0, 15), // Same day
          totalDays: new Decimal(1),
          leaveType: {
            name: 'Leave Without Pay',
            isPaid: false,
          },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(1);
        expect(result[0].leaveRequestId).toBe('leave-1');
        expect(result[0].requestNumber).toBe('LR-001');
        expect(result[0].leaveTypeName).toBe('Leave Without Pay');
        expect(result[0].totalDays).toBe(1);
        expect(result[0].dailyRate).toBe(500);
        expect(result[0].deductionAmount).toBe(500);
      });

      it('should calculate deduction for multi-day leave', async () => {
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2024, 0, 10), // Jan 10
          endDate: new Date(2024, 0, 14), // Jan 14 (5 days)
          totalDays: new Decimal(5),
          leaveType: {
            name: 'Leave Without Pay',
            isPaid: false,
          },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(1);
        expect(result[0].totalDays).toBe(5);
        expect(result[0].deductionAmount).toBe(2500); // 5 * 500
      });

      it('should handle half-day leave (FIN-001)', async () => {
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2024, 0, 15),
          endDate: new Date(2024, 0, 15),
          totalDays: new Decimal(0.5), // Half day
          leaveType: {
            name: 'Leave Without Pay',
            isPaid: false,
          },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(1);
        expect(result[0].totalDays).toBe(0.5);
        expect(result[0].deductionAmount).toBe(250); // 0.5 * 500
      });
    });

    describe('Leave spanning period boundaries', () => {
      it('should only count days within period when leave starts before period', async () => {
        // Leave starts Dec 28 and ends Jan 3
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2023, 11, 28), // Dec 28
          endDate: new Date(2024, 0, 3), // Jan 3
          totalDays: new Decimal(7), // Total 7 days
          leaveType: {
            name: 'LWP',
            isPaid: false,
          },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(1);
        // Only Jan 1-3 should be counted (3 days)
        expect(result[0].totalDays).toBe(3);
        expect(result[0].deductionAmount).toBe(1500); // 3 * 500
      });

      it('should only count days within period when leave ends after period', async () => {
        // Leave starts Jan 29 and ends Feb 2
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2024, 0, 29), // Jan 29
          endDate: new Date(2024, 1, 2), // Feb 2
          totalDays: new Decimal(5), // Total 5 days
          leaveType: {
            name: 'LWP',
            isPaid: false,
          },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(1);
        // Only Jan 29-31 should be counted (3 days)
        expect(result[0].totalDays).toBe(3);
        expect(result[0].deductionAmount).toBe(1500); // 3 * 500
      });

      it('should count full period days when leave spans entire period', async () => {
        // Leave from Dec 20 to Feb 10 (spans all of January)
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2023, 11, 20), // Dec 20
          endDate: new Date(2024, 1, 10), // Feb 10
          totalDays: new Decimal(52), // Total many days
          leaveType: {
            name: 'LWP',
            isPaid: false,
          },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(1);
        // All of January = 31 days
        expect(result[0].totalDays).toBe(31);
        expect(result[0].deductionAmount).toBe(15500); // 31 * 500
      });
    });

    describe('Multiple leaves in period', () => {
      it('should calculate deductions for multiple leaves', async () => {
        const mockLeaves = [
          {
            id: 'leave-1',
            requestNumber: 'LR-001',
            memberId,
            tenantId,
            status: LeaveStatus.APPROVED,
            startDate: new Date(2024, 0, 5),
            endDate: new Date(2024, 0, 5),
            totalDays: new Decimal(1),
            leaveType: { name: 'LWP', isPaid: false },
          },
          {
            id: 'leave-2',
            requestNumber: 'LR-002',
            memberId,
            tenantId,
            status: LeaveStatus.APPROVED,
            startDate: new Date(2024, 0, 20),
            endDate: new Date(2024, 0, 21),
            totalDays: new Decimal(2),
            leaveType: { name: 'LWP', isPaid: false },
          },
        ];

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(mockLeaves);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

        expect(result).toHaveLength(2);
        expect(result[0].deductionAmount).toBe(500); // 1 day
        expect(result[1].deductionAmount).toBe(1000); // 2 days
      });
    });

    describe('Rounding behavior', () => {
      it('should round deduction amount to 2 decimal places', async () => {
        const oddDailySalary = 333.33;
        const mockLeave = {
          id: 'leave-1',
          requestNumber: 'LR-001',
          memberId,
          tenantId,
          status: LeaveStatus.APPROVED,
          startDate: new Date(2024, 0, 15),
          endDate: new Date(2024, 0, 17), // 3 days
          totalDays: new Decimal(3),
          leaveType: { name: 'LWP', isPaid: false },
        };

        (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

        const result = await calculateUnpaidLeaveDeductions(memberId, year, month, oddDailySalary, tenantId);

        // 333.33 * 3 = 999.99
        expect(result[0].deductionAmount).toBe(999.99);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET UNPAID LEAVE DAYS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getUnpaidLeaveDaysInPeriod', () => {
    it('should return 0 when no unpaid leaves', async () => {
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUnpaidLeaveDaysInPeriod(memberId, year, month, tenantId);

      expect(result).toBe(0);
    });

    it('should sum total days from multiple leaves', async () => {
      const mockLeaves = [
        {
          startDate: new Date(2024, 0, 5),
          endDate: new Date(2024, 0, 5),
          totalDays: new Decimal(1),
        },
        {
          startDate: new Date(2024, 0, 10),
          endDate: new Date(2024, 0, 12),
          totalDays: new Decimal(3),
        },
        {
          startDate: new Date(2024, 0, 20),
          endDate: new Date(2024, 0, 20),
          totalDays: new Decimal(0.5), // Half day
        },
      ];

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue(mockLeaves);

      const result = await getUnpaidLeaveDaysInPeriod(memberId, year, month, tenantId);

      expect(result).toBe(4.5); // 1 + 3 + 0.5
    });

    it('should handle leaves spanning multiple months correctly', async () => {
      // Leave from Dec 30 to Jan 2 (spans two months)
      const mockLeave = {
        startDate: new Date(2023, 11, 30), // Dec 30
        endDate: new Date(2024, 0, 2), // Jan 2
        totalDays: new Decimal(4), // Total 4 days
      };

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

      const result = await getUnpaidLeaveDaysInPeriod(memberId, year, month, tenantId);

      // Only Jan 1-2 should be counted (2 days)
      expect(result).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // HAS UNPAID LEAVE CHECK
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('hasUnpaidLeaveInPeriod', () => {
    it('should return false when no unpaid leaves', async () => {
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      const result = await hasUnpaidLeaveInPeriod(memberId, year, month, tenantId);

      expect(result).toBe(false);
    });

    it('should return true when unpaid leave exists', async () => {
      const mockLeave = {
        startDate: new Date(2024, 0, 15),
        endDate: new Date(2024, 0, 15),
        totalDays: new Decimal(1),
      };

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

      const result = await hasUnpaidLeaveInPeriod(memberId, year, month, tenantId);

      expect(result).toBe(true);
    });

    it('should return true for half-day unpaid leave', async () => {
      const mockLeave = {
        startDate: new Date(2024, 0, 15),
        endDate: new Date(2024, 0, 15),
        totalDays: new Decimal(0.5),
      };

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

      const result = await hasUnpaidLeaveInPeriod(memberId, year, month, tenantId);

      expect(result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // QUERY FILTER VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Query filtering', () => {
    it('should filter by memberId and tenantId', async () => {
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            memberId,
            tenantId,
          }),
        })
      );
    });

    it('should filter by APPROVED status', async () => {
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: LeaveStatus.APPROVED,
          }),
        })
      );
    });

    it('should filter by isPaid=false on leave type', async () => {
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

      expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leaveType: { isPaid: false },
          }),
        })
      );
    });

    it('should use OR condition for date overlap detection', async () => {
      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([]);

      await calculateUnpaidLeaveDeductions(memberId, year, month, dailySalary, tenantId);

      const callArgs = (mockPrisma.leaveRequest.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR).toHaveLength(3); // Three overlap conditions
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle February in leap year', async () => {
      const mockLeave = {
        id: 'leave-1',
        requestNumber: 'LR-001',
        memberId,
        tenantId,
        status: LeaveStatus.APPROVED,
        startDate: new Date(2024, 1, 28), // Feb 28
        endDate: new Date(2024, 1, 29), // Feb 29 (leap year)
        totalDays: new Decimal(2),
        leaveType: { name: 'LWP', isPaid: false },
      };

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

      const result = await calculateUnpaidLeaveDeductions(memberId, 2024, 2, dailySalary, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].totalDays).toBe(2);
    });

    it('should handle December to January spanning leave', async () => {
      const mockLeave = {
        id: 'leave-1',
        requestNumber: 'LR-001',
        memberId,
        tenantId,
        status: LeaveStatus.APPROVED,
        startDate: new Date(2023, 11, 31), // Dec 31
        endDate: new Date(2024, 0, 1), // Jan 1
        totalDays: new Decimal(2),
        leaveType: { name: 'LWP', isPaid: false },
      };

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

      const result = await calculateUnpaidLeaveDeductions(memberId, 2024, 1, dailySalary, tenantId);

      expect(result).toHaveLength(1);
      // Only Jan 1 should be counted for January payroll
      expect(result[0].totalDays).toBe(1);
    });

    it('should handle zero daily salary', async () => {
      const mockLeave = {
        id: 'leave-1',
        requestNumber: 'LR-001',
        memberId,
        tenantId,
        status: LeaveStatus.APPROVED,
        startDate: new Date(2024, 0, 15),
        endDate: new Date(2024, 0, 15),
        totalDays: new Decimal(1),
        leaveType: { name: 'LWP', isPaid: false },
      };

      (mockPrisma.leaveRequest.findMany as jest.Mock).mockResolvedValue([mockLeave]);

      const result = await calculateUnpaidLeaveDeductions(memberId, year, month, 0, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].deductionAmount).toBe(0);
    });
  });
});
