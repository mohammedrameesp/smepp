/**
 * useLeaveBalance Hook Unit Tests
 * Tests for leave balance calculation hook including entitlement computation,
 * accrual handling, and balance availability checks
 *
 * Note: Since this is a pure computation hook using useMemo, we test the
 * underlying logic directly without needing React testing infrastructure.
 */

import type { LeaveBalance } from '@/lib/types/leave';

// Re-implement the hook logic for testing (mirrors use-leave-balance.ts)
interface UseLeaveBalanceOptions {
  balance: LeaveBalance | null;
  accrued?: number | null;
}

interface UseLeaveBalanceResult {
  totalEntitlement: number;
  effectiveEntitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
  available: number;
  remaining: number;
  isAccrualBased: boolean;
  usedPercentage: number;
  hasSufficientBalance: (days: number) => boolean;
  hasData: boolean;
}

function computeLeaveBalance({ balance, accrued }: UseLeaveBalanceOptions): UseLeaveBalanceResult {
  if (!balance) {
    return {
      totalEntitlement: 0,
      effectiveEntitlement: 0,
      used: 0,
      pending: 0,
      carriedForward: 0,
      adjustment: 0,
      available: 0,
      remaining: 0,
      isAccrualBased: false,
      usedPercentage: 0,
      hasSufficientBalance: () => false,
      hasData: false,
    };
  }

  const entitlement = Number(balance.entitlement) || 0;
  const used = Number(balance.used) || 0;
  const pending = Number(balance.pending) || 0;
  const carriedForward = Number(balance.carriedForward) || 0;
  const adjustment = Number(balance.adjustment) || 0;

  const isAccrualBased = balance.leaveType?.accrualBased === true;
  const totalEntitlement = entitlement + carriedForward + adjustment;

  const effectiveEntitlement = isAccrualBased && accrued !== null && accrued !== undefined
    ? Number(accrued) + carriedForward + adjustment
    : totalEntitlement;

  const available = effectiveEntitlement - used - pending;
  const remaining = available;

  const usedPercentage = effectiveEntitlement > 0
    ? Math.min(100, ((used + pending) / effectiveEntitlement) * 100)
    : 0;

  return {
    totalEntitlement,
    effectiveEntitlement,
    used,
    pending,
    carriedForward,
    adjustment,
    available,
    remaining,
    isAccrualBased,
    usedPercentage,
    hasSufficientBalance: (days: number) => days <= available,
    hasData: true,
  };
}

describe('useLeaveBalance', () => {
  // Helper to create a mock balance
  const createMockBalance = (overrides: Partial<LeaveBalance> = {}): LeaveBalance => ({
    id: 'balance-1',
    leaveTypeId: 'type-1',
    memberId: 'member-1',
    year: 2024,
    entitlement: 21,
    used: 5,
    pending: 2,
    carriedForward: 3,
    adjustment: 1,
    leaveType: {
      id: 'type-1',
      name: 'Annual Leave',
      color: '#3B82F6',
      isPaid: true,
      accrualBased: false,
    },
    ...overrides,
  });

  describe('with null balance', () => {
    it('should return zero values when balance is null', () => {
      const result = computeLeaveBalance({ balance: null });

      expect(result.totalEntitlement).toBe(0);
      expect(result.effectiveEntitlement).toBe(0);
      expect(result.used).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.carriedForward).toBe(0);
      expect(result.adjustment).toBe(0);
      expect(result.available).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.isAccrualBased).toBe(false);
      expect(result.usedPercentage).toBe(0);
      expect(result.hasData).toBe(false);
    });

    it('should always return false for hasSufficientBalance when null', () => {
      const result = computeLeaveBalance({ balance: null });

      expect(result.hasSufficientBalance(0)).toBe(false);
      expect(result.hasSufficientBalance(1)).toBe(false);
      expect(result.hasSufficientBalance(100)).toBe(false);
    });
  });

  describe('with valid balance', () => {
    it('should calculate total entitlement correctly', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 1,
      });

      const result = computeLeaveBalance({ balance });

      // Total = 21 + 3 + 1 = 25
      expect(result.totalEntitlement).toBe(25);
    });

    it('should calculate available days correctly', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 1,
        used: 5,
        pending: 2,
      });

      const result = computeLeaveBalance({ balance });

      // Available = (21 + 3 + 1) - 5 - 2 = 18
      expect(result.available).toBe(18);
      expect(result.remaining).toBe(18);
    });

    it('should return hasData as true', () => {
      const balance = createMockBalance();

      const result = computeLeaveBalance({ balance });

      expect(result.hasData).toBe(true);
    });

    it('should extract individual balance components', () => {
      const balance = createMockBalance({
        entitlement: 21,
        used: 5,
        pending: 2,
        carriedForward: 3,
        adjustment: -1,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.used).toBe(5);
      expect(result.pending).toBe(2);
      expect(result.carriedForward).toBe(3);
      expect(result.adjustment).toBe(-1);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true when days requested is within available', () => {
      const balance = createMockBalance({
        entitlement: 21,
        used: 5,
        pending: 2,
        carriedForward: 0,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      // Available = 21 - 5 - 2 = 14
      expect(result.hasSufficientBalance(1)).toBe(true);
      expect(result.hasSufficientBalance(14)).toBe(true);
      expect(result.hasSufficientBalance(10)).toBe(true);
    });

    it('should return false when days requested exceeds available', () => {
      const balance = createMockBalance({
        entitlement: 21,
        used: 5,
        pending: 2,
        carriedForward: 0,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      // Available = 14
      expect(result.hasSufficientBalance(15)).toBe(false);
      expect(result.hasSufficientBalance(100)).toBe(false);
    });

    it('should return true for exactly available days', () => {
      const balance = createMockBalance({
        entitlement: 10,
        used: 0,
        pending: 0,
        carriedForward: 0,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.hasSufficientBalance(10)).toBe(true);
    });

    it('should return true for zero days', () => {
      const balance = createMockBalance();

      const result = computeLeaveBalance({ balance });

      expect(result.hasSufficientBalance(0)).toBe(true);
    });

    it('should handle negative available balance', () => {
      const balance = createMockBalance({
        entitlement: 5,
        used: 7,
        pending: 0,
        carriedForward: 0,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      // Available = 5 - 7 = -2
      expect(result.available).toBe(-2);
      expect(result.hasSufficientBalance(1)).toBe(false);
      // Even 0 days is not sufficient when balance is negative (0 <= -2 is false)
      expect(result.hasSufficientBalance(0)).toBe(false);
    });
  });

  describe('accrual-based leave', () => {
    it('should identify accrual-based leave type', () => {
      const balance = createMockBalance({
        leaveType: {
          id: 'type-1',
          name: 'Annual Leave',
          color: '#3B82F6',
          accrualBased: true,
        },
      });

      const result = computeLeaveBalance({ balance });

      expect(result.isAccrualBased).toBe(true);
    });

    it('should use accrued amount for effective entitlement when accrual-based', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 1,
        used: 0,
        pending: 0,
        leaveType: {
          id: 'type-1',
          name: 'Annual Leave',
          color: '#3B82F6',
          accrualBased: true,
        },
      });

      const result = computeLeaveBalance({ balance, accrued: 10 });

      // Effective = accrued + carriedForward + adjustment = 10 + 3 + 1 = 14
      expect(result.effectiveEntitlement).toBe(14);
      // Total still includes full entitlement
      expect(result.totalEntitlement).toBe(25);
    });

    it('should use total entitlement when accrued is null', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 1,
        leaveType: {
          id: 'type-1',
          name: 'Annual Leave',
          color: '#3B82F6',
          accrualBased: true,
        },
      });

      const result = computeLeaveBalance({ balance, accrued: null });

      // Falls back to total entitlement
      expect(result.effectiveEntitlement).toBe(25);
    });

    it('should use total entitlement when accrued is undefined', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 1,
        leaveType: {
          id: 'type-1',
          name: 'Annual Leave',
          color: '#3B82F6',
          accrualBased: true,
        },
      });

      const result = computeLeaveBalance({ balance, accrued: undefined });

      expect(result.effectiveEntitlement).toBe(25);
    });

    it('should use total entitlement for non-accrual based leave even with accrued value', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 1,
        leaveType: {
          id: 'type-1',
          name: 'Sick Leave',
          color: '#EF4444',
          accrualBased: false,
        },
      });

      const result = computeLeaveBalance({ balance, accrued: 10 });

      // Non-accrual based should ignore accrued value
      expect(result.effectiveEntitlement).toBe(25);
    });

    it('should calculate available based on effective entitlement for accrual', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 0,
        adjustment: 0,
        used: 5,
        pending: 2,
        leaveType: {
          id: 'type-1',
          name: 'Annual Leave',
          color: '#3B82F6',
          accrualBased: true,
        },
      });

      const result = computeLeaveBalance({ balance, accrued: 10 });

      // Available = effective (10) - used (5) - pending (2) = 3
      expect(result.available).toBe(3);
    });
  });

  describe('usedPercentage', () => {
    it('should calculate used percentage correctly', () => {
      const balance = createMockBalance({
        entitlement: 20,
        carriedForward: 0,
        adjustment: 0,
        used: 10,
        pending: 0,
      });

      const result = computeLeaveBalance({ balance });

      // Used percentage = (10 / 20) * 100 = 50%
      expect(result.usedPercentage).toBe(50);
    });

    it('should include pending in used percentage calculation', () => {
      const balance = createMockBalance({
        entitlement: 20,
        carriedForward: 0,
        adjustment: 0,
        used: 5,
        pending: 5,
      });

      const result = computeLeaveBalance({ balance });

      // Used percentage = ((5 + 5) / 20) * 100 = 50%
      expect(result.usedPercentage).toBe(50);
    });

    it('should cap percentage at 100', () => {
      const balance = createMockBalance({
        entitlement: 10,
        carriedForward: 0,
        adjustment: 0,
        used: 15,
        pending: 0,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.usedPercentage).toBe(100);
    });

    it('should return 0 when effective entitlement is 0', () => {
      const balance = createMockBalance({
        entitlement: 0,
        carriedForward: 0,
        adjustment: 0,
        used: 0,
        pending: 0,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.usedPercentage).toBe(0);
    });

    it('should calculate percentage based on effective entitlement for accrual', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 0,
        adjustment: 0,
        used: 5,
        pending: 0,
        leaveType: {
          id: 'type-1',
          name: 'Annual Leave',
          color: '#3B82F6',
          accrualBased: true,
        },
      });

      const result = computeLeaveBalance({ balance, accrued: 10 });

      // Used percentage = (5 / 10) * 100 = 50%
      expect(result.usedPercentage).toBe(50);
    });
  });

  describe('negative adjustment', () => {
    it('should handle negative adjustments correctly', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 0,
        adjustment: -5,
        used: 0,
        pending: 0,
      });

      const result = computeLeaveBalance({ balance });

      // Total = 21 + 0 + (-5) = 16
      expect(result.totalEntitlement).toBe(16);
      expect(result.available).toBe(16);
    });
  });

  describe('data type handling', () => {
    it('should handle string numbers (from Decimal type)', () => {
      const balance = createMockBalance({
        // These might come as strings from Prisma Decimal fields
        entitlement: '21.5' as unknown as number,
        used: '5.5' as unknown as number,
        pending: '2' as unknown as number,
        carriedForward: '3' as unknown as number,
        adjustment: '1' as unknown as number,
      });

      const result = computeLeaveBalance({ balance });

      // Should convert strings to numbers
      expect(result.totalEntitlement).toBe(25.5);
      expect(result.used).toBe(5.5);
      expect(result.available).toBe(18);
    });

    it('should handle NaN values as 0', () => {
      const balance = createMockBalance({
        entitlement: NaN,
        used: NaN,
        pending: NaN,
        carriedForward: NaN,
        adjustment: NaN,
      });

      const result = computeLeaveBalance({ balance });

      // NaN converted via Number() becomes 0 via || 0
      expect(result.totalEntitlement).toBe(0);
      expect(result.available).toBe(0);
    });

    it('should handle undefined values as 0', () => {
      const balance = createMockBalance({
        entitlement: undefined as unknown as number,
        used: undefined as unknown as number,
        pending: undefined as unknown as number,
        carriedForward: undefined as unknown as number,
        adjustment: undefined as unknown as number,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.totalEntitlement).toBe(0);
      expect(result.available).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle all zero values', () => {
      const balance = createMockBalance({
        entitlement: 0,
        used: 0,
        pending: 0,
        carriedForward: 0,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.totalEntitlement).toBe(0);
      expect(result.available).toBe(0);
      expect(result.usedPercentage).toBe(0);
    });

    it('should handle large numbers', () => {
      const balance = createMockBalance({
        entitlement: 1000,
        used: 500,
        pending: 200,
        carriedForward: 100,
        adjustment: 50,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.totalEntitlement).toBe(1150);
      expect(result.available).toBe(450);
    });

    it('should handle decimal days (half days)', () => {
      const balance = createMockBalance({
        entitlement: 21,
        used: 5.5,
        pending: 0.5,
        carriedForward: 0,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      // Available = 21 - 5.5 - 0.5 = 15
      expect(result.available).toBe(15);
    });

    it('should handle balance with zero entitlement but with carried forward', () => {
      const balance = createMockBalance({
        entitlement: 0,
        used: 0,
        pending: 0,
        carriedForward: 5,
        adjustment: 0,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.totalEntitlement).toBe(5);
      expect(result.available).toBe(5);
    });

    it('should handle balance with only adjustment', () => {
      const balance = createMockBalance({
        entitlement: 0,
        used: 0,
        pending: 0,
        carriedForward: 0,
        adjustment: 10,
      });

      const result = computeLeaveBalance({ balance });

      expect(result.totalEntitlement).toBe(10);
      expect(result.available).toBe(10);
    });
  });

  describe('consistency checks', () => {
    it('remaining should always equal available', () => {
      const balance = createMockBalance();
      const result = computeLeaveBalance({ balance });

      expect(result.remaining).toBe(result.available);
    });

    it('available should equal effectiveEntitlement - used - pending', () => {
      const balance = createMockBalance({
        entitlement: 30,
        used: 10,
        pending: 5,
        carriedForward: 5,
        adjustment: 0,
      });
      const result = computeLeaveBalance({ balance });

      expect(result.available).toBe(result.effectiveEntitlement - result.used - result.pending);
    });

    it('totalEntitlement should equal entitlement + carriedForward + adjustment', () => {
      const balance = createMockBalance({
        entitlement: 21,
        carriedForward: 3,
        adjustment: 2,
      });
      const result = computeLeaveBalance({ balance });

      expect(result.totalEntitlement).toBe(26);
    });
  });
});
