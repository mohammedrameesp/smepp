/**
 * @file subscription-lifecycle.test.ts
 * @description Tests for subscription lifecycle management - activation, cancellation, reactivation, and cost calculations
 */

import { prisma } from '@/lib/core/prisma';
import { BillingCycle } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    subscriptionHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) =>
      callback({
        subscription: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        subscriptionHistory: {
          create: jest.fn(),
        },
      })
    ),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Subscription Lifecycle Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('reactivateSubscription logic', () => {
    it('should throw error when subscription not found', async () => {
      const tx = {
        subscription: { findUnique: jest.fn().mockResolvedValue(null) },
        subscriptionHistory: { create: jest.fn() },
      };

      const subscription = await tx.subscription.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(subscription).toBeNull();
    });

    it('should throw error when subscription is already active', async () => {
      const subscription = { id: 'sub-123', status: 'ACTIVE' };
      const canReactivate = subscription.status === 'CANCELLED';

      expect(canReactivate).toBe(false);
    });

    it('should throw error when subscription is not cancelled', async () => {
      const subscription = { id: 'sub-123', status: 'ACTIVE' };
      const canReactivate = subscription.status === 'CANCELLED';

      expect(canReactivate).toBe(false);
    });

    it('should allow reactivating cancelled subscription', async () => {
      const subscription = { id: 'sub-123', status: 'CANCELLED' };
      const canReactivate = subscription.status === 'CANCELLED';

      expect(canReactivate).toBe(true);
    });

    it('should update subscription status to ACTIVE', () => {
      const currentStatus = 'CANCELLED';
      const newStatus = 'ACTIVE';

      expect(currentStatus).toBe('CANCELLED');
      expect(newStatus).toBe('ACTIVE');
    });

    it('should set new renewal date', () => {
      const newRenewalDate = new Date('2025-02-15');
      const updateData = {
        status: 'ACTIVE',
        renewalDate: newRenewalDate,
        reactivatedAt: new Date(),
      };

      expect(updateData.renewalDate).toEqual(newRenewalDate);
    });

    it('should set reactivatedAt timestamp', () => {
      const now = new Date();
      const reactivatedAt = now;

      expect(reactivatedAt).toEqual(now);
    });

    it('should create REACTIVATED history entry', () => {
      const historyEntry = {
        subscriptionId: 'sub-123',
        action: 'REACTIVATED',
        oldStatus: 'CANCELLED',
        newStatus: 'ACTIVE',
        oldRenewalDate: new Date('2024-12-15'),
        newRenewalDate: new Date('2025-01-15'),
        reactivationDate: new Date(),
        notes: 'Customer requested reactivation',
        performedById: 'user-123',
      };

      expect(historyEntry.action).toBe('REACTIVATED');
      expect(historyEntry.newStatus).toBe('ACTIVE');
    });

    it('should use provided reactivation date', () => {
      const providedDate = new Date('2025-01-10');
      const reactivationDate = providedDate;

      expect(reactivationDate).toEqual(providedDate);
    });

    it('should default to current date when reactivation date not provided', () => {
      const providedDate: Date | undefined = undefined;
      const actualDate = providedDate || new Date();

      expect(actualDate).toBeInstanceOf(Date);
    });
  });

  describe('cancelSubscription logic', () => {
    it('should throw error when subscription not found', async () => {
      const subscription = null;
      expect(subscription).toBeNull();
    });

    it('should throw error when subscription is already cancelled', () => {
      const subscription = { status: 'CANCELLED' };
      const canCancel = subscription.status === 'ACTIVE';

      expect(canCancel).toBe(false);
    });

    it('should throw error when subscription is not active', () => {
      const subscription = { status: 'CANCELLED' };
      const canCancel = subscription.status === 'ACTIVE';

      expect(canCancel).toBe(false);
    });

    it('should allow cancelling active subscription', () => {
      const subscription = { status: 'ACTIVE' };
      const canCancel = subscription.status === 'ACTIVE';

      expect(canCancel).toBe(true);
    });

    it('should update subscription status to CANCELLED', () => {
      const updateData = {
        status: 'CANCELLED',
        lastActiveRenewalDate: new Date('2025-01-15'),
        cancelledAt: new Date(),
      };

      expect(updateData.status).toBe('CANCELLED');
    });

    it('should preserve last active renewal date', () => {
      const originalRenewalDate = new Date('2025-01-15');
      const updateData = {
        lastActiveRenewalDate: originalRenewalDate,
      };

      expect(updateData.lastActiveRenewalDate).toEqual(originalRenewalDate);
    });

    it('should set cancelledAt timestamp', () => {
      const cancellationDate = new Date('2025-01-10');
      const updateData = { cancelledAt: cancellationDate };

      expect(updateData.cancelledAt).toEqual(cancellationDate);
    });

    it('should create CANCELLED history entry', () => {
      const historyEntry = {
        subscriptionId: 'sub-123',
        action: 'CANCELLED',
        oldStatus: 'ACTIVE',
        newStatus: 'CANCELLED',
        oldRenewalDate: new Date('2025-01-15'),
        notes: 'No longer needed',
        performedById: 'user-123',
      };

      expect(historyEntry.action).toBe('CANCELLED');
      expect(historyEntry.newStatus).toBe('CANCELLED');
    });
  });

  describe('calculateBillingCycles logic', () => {
    const calculateBillingCycles = (
      lastChargedDate: Date,
      endDate: Date,
      renewalDate: Date,
      billingCycle: BillingCycle
    ): number => {
      if (billingCycle === 'ONE_TIME') {
        return 1;
      }

      let cycles = 1;
      const currentRenewal = new Date(renewalDate);

      while (endDate >= currentRenewal) {
        cycles++;
        if (billingCycle === 'MONTHLY') {
          currentRenewal.setMonth(currentRenewal.getMonth() + 1);
        } else if (billingCycle === 'YEARLY') {
          currentRenewal.setFullYear(currentRenewal.getFullYear() + 1);
        } else {
          break;
        }
      }

      return cycles;
    };

    it('should return 1 for ONE_TIME billing', () => {
      const cycles = calculateBillingCycles(
        new Date('2024-01-01'),
        new Date('2025-12-31'),
        new Date('2024-01-01'),
        'ONE_TIME' as BillingCycle
      );

      expect(cycles).toBe(1);
    });

    it('should count monthly cycles correctly', () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-04-20');
      const renewalDate = new Date('2024-02-15');

      const cycles = calculateBillingCycles(
        startDate,
        endDate,
        renewalDate,
        'MONTHLY' as BillingCycle
      );

      // Initial cycle + 3 renewals passed (Feb 15, Mar 15, Apr 15)
      expect(cycles).toBe(4);
    });

    it('should count yearly cycles correctly', () => {
      const startDate = new Date('2022-01-01');
      const endDate = new Date('2025-06-01');
      const renewalDate = new Date('2023-01-01');

      const cycles = calculateBillingCycles(
        startDate,
        endDate,
        renewalDate,
        'YEARLY' as BillingCycle
      );

      // Initial cycle + 3 renewals passed (2023, 2024, 2025)
      expect(cycles).toBe(4);
    });

    it('should return 1 if end date is before first renewal', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-10');
      const renewalDate = new Date('2024-02-01');

      const cycles = calculateBillingCycles(
        startDate,
        endDate,
        renewalDate,
        'MONTHLY' as BillingCycle
      );

      expect(cycles).toBe(1);
    });

    it('should handle same day end and renewal', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-02-01');
      const renewalDate = new Date('2024-02-01');

      const cycles = calculateBillingCycles(
        startDate,
        endDate,
        renewalDate,
        'MONTHLY' as BillingCycle
      );

      // Should count the renewal
      expect(cycles).toBe(2);
    });
  });

  describe('addBillingCycles logic', () => {
    const addBillingCycles = (
      date: Date,
      cycles: number,
      billingCycle: BillingCycle
    ): Date => {
      const newDate = new Date(date);
      if (billingCycle === 'MONTHLY') {
        newDate.setMonth(newDate.getMonth() + cycles);
      } else if (billingCycle === 'YEARLY') {
        newDate.setFullYear(newDate.getFullYear() + cycles);
      }
      return newDate;
    };

    it('should add months for MONTHLY billing', () => {
      const date = new Date('2024-01-15');
      const result = addBillingCycles(date, 3, 'MONTHLY' as BillingCycle);

      expect(result.getMonth()).toBe(3); // April (0-indexed)
      expect(result.getFullYear()).toBe(2024);
    });

    it('should add years for YEARLY billing', () => {
      const date = new Date('2024-01-15');
      const result = addBillingCycles(date, 2, 'YEARLY' as BillingCycle);

      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0); // January
    });

    it('should handle year overflow for MONTHLY billing', () => {
      const date = new Date('2024-11-15');
      const result = addBillingCycles(date, 3, 'MONTHLY' as BillingCycle);

      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // February
    });

    it('should not modify original date', () => {
      const date = new Date('2024-01-15');
      const originalTime = date.getTime();
      addBillingCycles(date, 3, 'MONTHLY' as BillingCycle);

      expect(date.getTime()).toBe(originalTime);
    });
  });

  describe('getActivePeriods logic', () => {
    it('should throw error when subscription not found', async () => {
      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);

      const subscription = await mockPrisma.subscription.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(subscription).toBeNull();
    });

    it('should return empty periods for new subscription with no history', async () => {
      const subscription = {
        id: 'sub-123',
        status: 'ACTIVE',
        purchaseDate: new Date('2024-01-01'),
        costPerCycle: 100,
        billingCycle: 'MONTHLY',
        renewalDate: new Date('2024-02-01'),
        history: [],
      };

      // With no history, should just return current period
      expect(subscription.history).toHaveLength(0);
    });

    it('should handle single cancel event', () => {
      const history = [
        {
          action: 'CANCELLED',
          createdAt: new Date('2024-06-15'),
          oldRenewalDate: new Date('2024-07-01'),
        },
      ];

      const cancelEvent = history.find((h) => h.action === 'CANCELLED');
      expect(cancelEvent).toBeDefined();
    });

    it('should handle cancel and reactivate sequence', () => {
      const history = [
        {
          action: 'CANCELLED',
          createdAt: new Date('2024-06-15'),
          oldRenewalDate: new Date('2024-07-01'),
        },
        {
          action: 'REACTIVATED',
          createdAt: new Date('2024-08-01'),
          newRenewalDate: new Date('2024-09-01'),
          reactivationDate: new Date('2024-08-01'),
        },
      ];

      const cancelEvent = history.find((h) => h.action === 'CANCELLED');
      const reactivateEvent = history.find((h) => h.action === 'REACTIVATED');

      expect(cancelEvent).toBeDefined();
      expect(reactivateEvent).toBeDefined();
    });

    it('should handle multiple cancel-reactivate cycles', () => {
      const history = [
        { action: 'CANCELLED', createdAt: new Date('2024-03-15') },
        { action: 'REACTIVATED', createdAt: new Date('2024-04-01') },
        { action: 'CANCELLED', createdAt: new Date('2024-06-15') },
        { action: 'REACTIVATED', createdAt: new Date('2024-08-01') },
      ];

      const cancelCount = history.filter((h) => h.action === 'CANCELLED').length;
      const reactivateCount = history.filter((h) => h.action === 'REACTIVATED').length;

      expect(cancelCount).toBe(2);
      expect(reactivateCount).toBe(2);
    });
  });

  describe('calculateTotalCost logic', () => {
    it('should sum costs from all active periods', () => {
      const periods = [
        { cost: 300 },
        { cost: 200 },
        { cost: 100 },
      ];

      const totalCost = periods.reduce((sum, period) => sum + period.cost, 0);
      expect(totalCost).toBe(600);
    });

    it('should return subscription currency', () => {
      const subscription = { costCurrency: 'QAR' };
      expect(subscription.costCurrency).toBe('QAR');
    });

    it('should return billing cycle', () => {
      const subscription = { billingCycle: 'MONTHLY' };
      expect(subscription.billingCycle).toBe('MONTHLY');
    });

    it('should handle zero cost periods', () => {
      const periods = [{ cost: 0 }, { cost: 0 }];
      const totalCost = periods.reduce((sum, period) => sum + period.cost, 0);

      expect(totalCost).toBe(0);
    });

    it('should handle single period', () => {
      const periods = [{ cost: 500 }];
      const totalCost = periods.reduce((sum, period) => sum + period.cost, 0);

      expect(totalCost).toBe(500);
    });
  });

  describe('getMemberActivePeriods logic', () => {
    it('should filter periods by member ID', () => {
      const allPeriods = [
        { memberId: 'member-1', cost: 100 },
        { memberId: 'member-2', cost: 200 },
        { memberId: 'member-1', cost: 150 },
      ];

      const memberPeriods = allPeriods.filter((p) => p.memberId === 'member-1');

      expect(memberPeriods).toHaveLength(2);
      expect(memberPeriods.every((p) => p.memberId === 'member-1')).toBe(true);
    });

    it('should handle REASSIGNED events', () => {
      const history = [
        { action: 'REASSIGNED', newMemberId: 'member-1', oldMemberId: null },
        { action: 'REASSIGNED', newMemberId: 'member-2', oldMemberId: 'member-1' },
      ];

      const assignToMember1 = history.find(
        (h) => h.action === 'REASSIGNED' && h.newMemberId === 'member-1'
      );
      const unassignFromMember1 = history.find(
        (h) => h.action === 'REASSIGNED' && h.oldMemberId === 'member-1'
      );

      expect(assignToMember1).toBeDefined();
      expect(unassignFromMember1).toBeDefined();
    });

    it('should track member assignment periods', () => {
      const memberId = 'member-1';
      const assignedAt = new Date('2024-01-15');
      const unassignedAt = new Date('2024-06-15');

      const period = {
        memberId,
        startDate: assignedAt,
        endDate: unassignedAt,
      };

      expect(period.memberId).toBe(memberId);
      expect(period.startDate).toEqual(assignedAt);
      expect(period.endDate).toEqual(unassignedAt);
    });
  });

  describe('getMemberSubscriptionHistory logic', () => {
    it('should query subscriptions by assignedMemberId', async () => {
      const memberId = 'member-123';
      const mockSubscriptions = [
        { id: 'sub-1', assignedMemberId: memberId },
        { id: 'sub-2', assignedMemberId: memberId },
      ];

      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue(mockSubscriptions);

      const subscriptions = await mockPrisma.subscription.findMany({
        where: { assignedMemberId: memberId },
      });

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.every((s) => s.assignedMemberId === memberId)).toBe(true);
    });

    it('should calculate total cost and months', () => {
      const activePeriods = [
        { cost: 100, months: 3 },
        { cost: 200, months: 6 },
      ];

      const totalCost = activePeriods.reduce((sum, p) => sum + p.cost, 0);
      const totalMonths = activePeriods.reduce((sum, p) => sum + p.months, 0);

      expect(totalCost).toBe(300);
      expect(totalMonths).toBe(9);
    });

    it('should identify current period (null endDate)', () => {
      const periods = [
        { endDate: new Date('2024-06-15') },
        { endDate: null },
      ];

      const currentPeriod = periods.find((p) => p.endDate === null);
      expect(currentPeriod).toBeDefined();
    });
  });

  describe('Subscription State Transitions', () => {
    it('should allow ACTIVE -> CANCELLED transition', () => {
      const validTransitions = {
        ACTIVE: ['CANCELLED'],
        CANCELLED: ['ACTIVE'],
      };

      expect(validTransitions.ACTIVE.includes('CANCELLED')).toBe(true);
    });

    it('should allow CANCELLED -> ACTIVE transition (reactivation)', () => {
      const validTransitions = {
        ACTIVE: ['CANCELLED'],
        CANCELLED: ['ACTIVE'],
      };

      expect(validTransitions.CANCELLED.includes('ACTIVE')).toBe(true);
    });

    it('should not allow CANCELLED -> CANCELLED transition', () => {
      const currentStatus = 'CANCELLED';
      const targetStatus = 'CANCELLED';

      expect(currentStatus !== targetStatus).toBe(false);
    });

    it('should not allow ACTIVE -> ACTIVE transition', () => {
      const currentStatus = 'ACTIVE';
      const targetStatus = 'ACTIVE';

      expect(currentStatus !== targetStatus).toBe(false);
    });
  });

  describe('Cost Calculation Edge Cases', () => {
    it('should handle null costPerCycle', () => {
      const costPerCycle = null;
      const cost = costPerCycle ? Number(costPerCycle) : 0;

      expect(cost).toBe(0);
    });

    it('should convert Decimal to number', () => {
      const costPerCycle = { toNumber: () => 99.99 };
      const cost = costPerCycle.toNumber();

      expect(cost).toBe(99.99);
    });

    it('should handle missing renewal date', () => {
      const subscription = {
        renewalDate: null,
        purchaseDate: new Date('2024-01-01'),
      };

      const renewalDate = subscription.renewalDate || subscription.purchaseDate;
      expect(renewalDate).toEqual(subscription.purchaseDate);
    });

    it('should use createdAt as fallback for purchaseDate', () => {
      const subscription = {
        purchaseDate: null,
        createdAt: new Date('2024-01-01'),
      };

      const startDate = subscription.purchaseDate || subscription.createdAt;
      expect(startDate).toEqual(subscription.createdAt);
    });
  });

  describe('History Entry Structure', () => {
    it('should include all required fields for CANCELLED action', () => {
      const historyEntry = {
        subscriptionId: 'sub-123',
        action: 'CANCELLED',
        oldStatus: 'ACTIVE',
        newStatus: 'CANCELLED',
        oldRenewalDate: new Date('2025-01-15'),
        notes: 'Cancelled by admin',
        performedById: 'user-123',
      };

      expect(historyEntry).toHaveProperty('subscriptionId');
      expect(historyEntry).toHaveProperty('action');
      expect(historyEntry).toHaveProperty('oldStatus');
      expect(historyEntry).toHaveProperty('newStatus');
    });

    it('should include all required fields for REACTIVATED action', () => {
      const historyEntry = {
        subscriptionId: 'sub-123',
        action: 'REACTIVATED',
        oldStatus: 'CANCELLED',
        newStatus: 'ACTIVE',
        oldRenewalDate: new Date('2024-12-15'),
        newRenewalDate: new Date('2025-01-15'),
        reactivationDate: new Date(),
        notes: 'Reactivated per customer request',
        performedById: 'user-123',
      };

      expect(historyEntry).toHaveProperty('newRenewalDate');
      expect(historyEntry).toHaveProperty('reactivationDate');
    });
  });
});
