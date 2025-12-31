/**
 * @file leave-balance-init.test.ts
 * @description Unit tests for leave balance initialization utilities
 * @module tests/unit/lib/leave
 *
 * Tests cover:
 * - Pro-rata entitlement calculation (FIN-008)
 * - Service-based annual leave entitlement (21 vs 28 days)
 * - Leave balance initialization for new employees
 * - Balance re-initialization when HR profile changes
 * - Category-based skipping (PARENTAL, RELIGIOUS)
 */

import {
  initializeUserLeaveBalances,
  reinitializeUserLeaveBalances,
  initializeAllUsersLeaveBalances,
} from '@/lib/domains/hr/leave/leave-balance-init';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    hRProfile: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    leaveType: { findMany: jest.fn() },
    leaveBalance: { findMany: jest.fn(), createMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  },
}));

// Mock leave-utils
jest.mock('@/lib/leave-utils', () => ({
  calculateServiceMonths: jest.fn((joinDate: Date, refDate: Date) => {
    const years = refDate.getFullYear() - joinDate.getFullYear();
    const months = refDate.getMonth() - joinDate.getMonth();
    return years * 12 + months;
  }),
}));

import { prisma } from '@/lib/core/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Leave Balance Initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZE USER LEAVE BALANCES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('initializeUserLeaveBalances', () => {
    const userId = 'user-123';
    const tenantId = 'tenant-456';
    const currentYear = new Date().getFullYear();

    it('should create leave balances for eligible leave types', async () => {
      // User joined 2 years ago
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 2);

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0, isActive: true },
        { id: 'lt-2', name: 'Sick Leave', category: 'MEDICAL', defaultDays: 14, minimumServiceMonths: 0, isActive: true },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      const result = await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId, leaveTypeId: 'lt-1', year: currentYear, tenantId }),
          expect.objectContaining({ userId, leaveTypeId: 'lt-2', year: currentYear, tenantId }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should skip PARENTAL and RELIGIOUS categories (admin-assigned)', async () => {
      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: new Date('2020-01-01'),
        gender: 'FEMALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
        { id: 'lt-2', name: 'Maternity Leave', category: 'PARENTAL', defaultDays: 50, minimumServiceMonths: 0 },
        { id: 'lt-3', name: 'Hajj Leave', category: 'RELIGIOUS', defaultDays: 14, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(2); // PARENTAL and RELIGIOUS skipped
    });

    it('should skip leave types where service requirement not met', async () => {
      // User joined 6 months ago
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 6);

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
        { id: 'lt-2', name: 'Hajj Leave', category: 'STANDARD', defaultDays: 14, minimumServiceMonths: 24 }, // Requires 2 years
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1); // Hajj Leave skipped due to service requirement
    });

    it('should skip already existing balances', async () => {
      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: new Date('2020-01-01'),
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
        { id: 'lt-2', name: 'Sick Leave', category: 'MEDICAL', defaultDays: 14, minimumServiceMonths: 0 },
      ]);

      // Annual Leave balance already exists
      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([
        { leaveTypeId: 'lt-1' },
      ]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(1); // Annual Leave skipped (already exists)
    });

    it('should calculate 28 days for employees with 5+ years service', async () => {
      // User joined 6 years ago
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 6);

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            leaveTypeId: 'lt-1',
            entitlement: 28, // 5+ years = 28 days
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should apply FIN-008 pro-rata for mid-year joiners', async () => {
      const currentYear = new Date().getFullYear();
      // User joined in July of current year (6 months remaining)
      const joinDate = new Date(currentYear, 6, 1); // July 1

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Sick Leave', category: 'MEDICAL', defaultDays: 12, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await initializeUserLeaveBalances(userId, currentYear, tenantId);

      // 6 remaining months / 12 * 12 days = 6 days
      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            leaveTypeId: 'lt-1',
            entitlement: 6,
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should give full entitlement for employees who joined before the leave year', async () => {
      const currentYear = new Date().getFullYear();
      const joinDate = new Date(currentYear - 1, 6, 1); // Last year

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Sick Leave', category: 'MEDICAL', defaultDays: 12, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            entitlement: 12, // Full entitlement
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should give 0 entitlement for employees who join after the leave year', async () => {
      const currentYear = new Date().getFullYear();
      const joinDate = new Date(currentYear + 1, 0, 1); // Next year

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Sick Leave', category: 'MEDICAL', defaultDays: 12, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);

      const result = await initializeUserLeaveBalances(userId, currentYear, tenantId);

      // Should skip because pro-rata is 0
      expect(result.skipped).toBe(1);
      expect(mockPrisma.leaveBalance.createMany).not.toHaveBeenCalled();
    });

    it('should get tenantId from user memberships if not provided', async () => {
      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: new Date('2020-01-01'),
        gender: 'MALE',
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationMemberships: [{ organizationId: 'auto-tenant-id' }],
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);

      await initializeUserLeaveBalances(userId, currentYear); // No tenantId provided

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          organizationMemberships: {
            select: { organizationId: true },
            take: 1,
          },
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REINITIALIZE USER LEAVE BALANCES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('reinitializeUserLeaveBalances', () => {
    const userId = 'user-123';
    const tenantId = 'tenant-456';
    const currentYear = new Date().getFullYear();

    it('should update entitlement if changed and no leave used', async () => {
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 6); // 6 years service

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([
        { id: 'bal-1', leaveTypeId: 'lt-1', entitlement: 21, used: 0, pending: 0, leaveType: {} },
      ]);

      (mockPrisma.leaveBalance.update as jest.Mock).mockResolvedValue({});

      const result = await reinitializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.updated).toBe(1);
      expect(mockPrisma.leaveBalance.update).toHaveBeenCalledWith({
        where: { id: 'bal-1' },
        data: { entitlement: 28 }, // Updated from 21 to 28
      });
    });

    it('should NOT update entitlement if leave has been used', async () => {
      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: new Date('2015-01-01'),
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([
        { id: 'bal-1', leaveTypeId: 'lt-1', entitlement: 21, used: 5, pending: 0, leaveType: {} },
      ]);

      const result = await reinitializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.updated).toBe(0);
      expect(mockPrisma.leaveBalance.update).not.toHaveBeenCalled();
    });

    it('should create new balance if user now meets service requirement', async () => {
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 25); // 25 months ago

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Special Leave', category: 'STANDARD', defaultDays: 5, minimumServiceMonths: 24 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]); // No existing balance
      (mockPrisma.leaveBalance.create as jest.Mock).mockResolvedValue({});

      const result = await reinitializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.created).toBe(1);
      expect(mockPrisma.leaveBalance.create).toHaveBeenCalled();
    });

    it('should delete balance if user no longer meets service requirement and nothing used', async () => {
      // This scenario would be rare (service months decreasing) but tests the logic
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 6); // Only 6 months

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Special Leave', category: 'STANDARD', defaultDays: 5, minimumServiceMonths: 12 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([
        { id: 'bal-1', leaveTypeId: 'lt-1', entitlement: 5, used: 0, pending: 0, leaveType: {} },
      ]);

      (mockPrisma.leaveBalance.delete as jest.Mock).mockResolvedValue({});

      const result = await reinitializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.deleted).toBe(1);
      expect(mockPrisma.leaveBalance.delete).toHaveBeenCalledWith({
        where: { id: 'bal-1' },
      });
    });

    it('should NOT delete balance if leave has been used', async () => {
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 6);

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Special Leave', category: 'STANDARD', defaultDays: 5, minimumServiceMonths: 12 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([
        { id: 'bal-1', leaveTypeId: 'lt-1', entitlement: 5, used: 2, pending: 0, leaveType: {} },
      ]);

      const result = await reinitializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(result.deleted).toBe(0);
      expect(mockPrisma.leaveBalance.delete).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZE ALL USERS LEAVE BALANCES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('initializeAllUsersLeaveBalances', () => {
    it('should process all non-system users', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);

      // Mock for each user's initialization
      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: new Date('2020-01-01'),
        gender: 'MALE',
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationMemberships: [{ organizationId: 'tenant-1' }],
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await initializeAllUsersLeaveBalances();

      expect(result.usersProcessed).toBe(3);
      expect(result.totalCreated).toBe(3); // 1 balance per user
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { isSystemAccount: false },
        select: { id: true },
      });
    });

    it('should aggregate created and skipped counts across all users', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: new Date('2020-01-01'),
        gender: 'MALE',
      });

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        organizationMemberships: [{ organizationId: 'tenant-1' }],
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Annual Leave', category: 'STANDARD', defaultDays: 21, minimumServiceMonths: 0 },
        { id: 'lt-2', name: 'Maternity', category: 'PARENTAL', defaultDays: 50, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await initializeAllUsersLeaveBalances();

      expect(result.usersProcessed).toBe(2);
      expect(result.totalCreated).toBe(2); // 1 Annual Leave per user
      expect(result.totalSkipped).toBe(2); // 1 Maternity (PARENTAL) skipped per user
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRO-RATA CALCULATION EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Pro-rata calculation edge cases', () => {
    const userId = 'user-123';
    const tenantId = 'tenant-456';

    it('should round pro-rata to nearest 0.5', async () => {
      const currentYear = new Date().getFullYear();
      // Join in October (3 months remaining): 3/12 * 10 = 2.5 days
      const joinDate = new Date(currentYear, 9, 15); // October 15

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Leave', category: 'STANDARD', defaultDays: 10, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            entitlement: 2.5, // 3/12 * 10 = 2.5
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should handle January joiner (full year)', async () => {
      const currentYear = new Date().getFullYear();
      const joinDate = new Date(currentYear, 0, 1); // January 1

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Leave', category: 'STANDARD', defaultDays: 12, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            entitlement: 12, // Full year
          }),
        ]),
        skipDuplicates: true,
      });
    });

    it('should handle December joiner (1 month remaining)', async () => {
      const currentYear = new Date().getFullYear();
      const joinDate = new Date(currentYear, 11, 1); // December 1

      (mockPrisma.hRProfile.findUnique as jest.Mock).mockResolvedValue({
        dateOfJoining: joinDate,
        gender: 'MALE',
      });

      (mockPrisma.leaveType.findMany as jest.Mock).mockResolvedValue([
        { id: 'lt-1', name: 'Leave', category: 'STANDARD', defaultDays: 12, minimumServiceMonths: 0 },
      ]);

      (mockPrisma.leaveBalance.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.leaveBalance.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      await initializeUserLeaveBalances(userId, currentYear, tenantId);

      expect(mockPrisma.leaveBalance.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            entitlement: 1, // 1/12 * 12 = 1
          }),
        ]),
        skipDuplicates: true,
      });
    });
  });
});
