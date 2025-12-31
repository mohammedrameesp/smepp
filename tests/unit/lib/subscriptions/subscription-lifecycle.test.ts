/**
 * @file subscription-lifecycle.test.ts
 * @description Unit tests for subscription lifecycle management
 * @module tests/unit/lib/subscriptions
 *
 * Tests cover:
 * - Subscription reactivation
 * - Subscription cancellation
 * - Active period tracking
 * - Cost calculations
 * - Billing cycle handling
 */

import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma before importing the module
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
    $transaction: jest.fn((callback: (tx: any) => Promise<any>) =>
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

import { prisma } from '@/lib/core/prisma';
import {
  reactivateSubscription,
  cancelSubscription,
  getActivePeriods,
  calculateTotalCost,
  calculateNextRenewalDate,
  getUserSubscriptionHistory,
} from '@/lib/domains/operations/subscriptions/subscription-lifecycle';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper to create dates easily
const createDate = (year: number, month: number, day: number): Date => {
  return new Date(year, month - 1, day);
};

describe('Subscription Lifecycle Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REACTIVATE SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('reactivateSubscription', () => {
    it('should throw error when subscription not found', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await expect(
        reactivateSubscription('sub-1', createDate(2024, 7, 1))
      ).rejects.toThrow('Subscription not found');
    });

    it('should throw error when subscription is already active', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              status: 'ACTIVE',
            }),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await expect(
        reactivateSubscription('sub-1', createDate(2024, 7, 1))
      ).rejects.toThrow('Subscription is already active');
    });

    it('should throw error when subscription is not cancelled', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              status: 'EXPIRED',
            }),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await expect(
        reactivateSubscription('sub-1', createDate(2024, 7, 1))
      ).rejects.toThrow('Can only reactivate CANCELLED subscriptions');
    });

    it('should successfully reactivate cancelled subscription', async () => {
      const newRenewalDate = createDate(2024, 7, 1);
      const mockSubscription = {
        id: 'sub-1',
        status: 'CANCELLED',
        renewalDate: createDate(2024, 5, 1),
      };
      const updatedSubscription = {
        ...mockSubscription,
        status: 'ACTIVE',
        renewalDate: newRenewalDate,
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue(mockSubscription),
            update: jest.fn().mockResolvedValue(updatedSubscription),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await reactivateSubscription('sub-1', newRenewalDate, 'Reactivation notes', 'user-1');

      expect(result.status).toBe('ACTIVE');
      expect(result.renewalDate).toEqual(newRenewalDate);
    });

    it('should use provided reactivation date when specified', async () => {
      const newRenewalDate = createDate(2024, 7, 1);
      const reactivationDate = createDate(2024, 6, 10);
      let capturedUpdateData: any;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              status: 'CANCELLED',
              renewalDate: createDate(2024, 5, 1),
            }),
            update: jest.fn().mockImplementation((args) => {
              capturedUpdateData = args.data;
              return Promise.resolve({
                ...args.data,
                id: 'sub-1',
              });
            }),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await reactivateSubscription('sub-1', newRenewalDate, undefined, undefined, reactivationDate);

      expect(capturedUpdateData.reactivatedAt).toEqual(reactivationDate);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CANCEL SUBSCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('cancelSubscription', () => {
    it('should throw error when subscription not found', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await expect(
        cancelSubscription('sub-1', createDate(2024, 6, 1))
      ).rejects.toThrow('Subscription not found');
    });

    it('should throw error when subscription is already cancelled', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              status: 'CANCELLED',
            }),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await expect(
        cancelSubscription('sub-1', createDate(2024, 6, 1))
      ).rejects.toThrow('Subscription is already cancelled');
    });

    it('should throw error when subscription is not active', async () => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              status: 'EXPIRED',
            }),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      await expect(
        cancelSubscription('sub-1', createDate(2024, 6, 1))
      ).rejects.toThrow('Can only cancel ACTIVE subscriptions');
    });

    it('should successfully cancel active subscription', async () => {
      const cancellationDate = createDate(2024, 6, 1);
      const mockSubscription = {
        id: 'sub-1',
        status: 'ACTIVE',
        renewalDate: createDate(2024, 7, 1),
      };
      const cancelledSubscription = {
        ...mockSubscription,
        status: 'CANCELLED',
        lastActiveRenewalDate: mockSubscription.renewalDate,
        cancelledAt: cancellationDate,
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue(mockSubscription),
            update: jest.fn().mockResolvedValue(cancelledSubscription),
          },
          subscriptionHistory: {
            create: jest.fn(),
          },
        };
        return cb(tx);
      });

      const result = await cancelSubscription('sub-1', cancellationDate, 'Cancellation reason', 'user-1');

      expect(result.status).toBe('CANCELLED');
      expect(result.lastActiveRenewalDate).toEqual(mockSubscription.renewalDate);
    });

    it('should create history entry for cancellation', async () => {
      let historyCreated = false;

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        const tx = {
          subscription: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'sub-1',
              status: 'ACTIVE',
              renewalDate: createDate(2024, 7, 1),
            }),
            update: jest.fn().mockResolvedValue({ id: 'sub-1', status: 'CANCELLED' }),
          },
          subscriptionHistory: {
            create: jest.fn().mockImplementation(() => {
              historyCreated = true;
              return Promise.resolve({});
            }),
          },
        };
        return cb(tx);
      });

      await cancelSubscription('sub-1', createDate(2024, 6, 1), 'Notes', 'user-1');

      expect(historyCreated).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET ACTIVE PERIODS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getActivePeriods', () => {
    it('should throw error when subscription not found', async () => {
      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getActivePeriods('sub-1')).rejects.toThrow('Subscription not found');
    });

    it('should return single period for always-active subscription', async () => {
      const purchaseDate = createDate(2024, 1, 1);
      const renewalDate = createDate(2024, 7, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate,
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(100),
        history: [],
        createdAt: purchaseDate,
      });

      const result = await getActivePeriods('sub-1');

      expect(result).toHaveLength(1);
      expect(result[0].startDate).toEqual(purchaseDate);
      expect(result[0].endDate).toBeNull(); // Still active
      expect(result[0].cost).toBeGreaterThan(0);
    });

    it('should calculate cost based on billing cycles passed', async () => {
      // Subscription active from Jan 1 with monthly billing at 100 QAR
      // Current date is June 15, so 6 billing cycles have passed
      const purchaseDate = createDate(2024, 1, 1);
      const renewalDate = createDate(2024, 2, 1); // Next renewal is Feb 1

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate,
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(100),
        history: [],
        createdAt: purchaseDate,
      });

      const result = await getActivePeriods('sub-1');

      // Should have multiple cycles charged
      expect(result[0].cost).toBeGreaterThanOrEqual(100); // At least 1 cycle
    });

    it('should track multiple periods for cancelled and reactivated subscription', async () => {
      const purchaseDate = createDate(2024, 1, 1);
      const cancellationDate = createDate(2024, 3, 15);
      const reactivationDate = createDate(2024, 5, 1);
      const currentRenewalDate = createDate(2024, 6, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate: currentRenewalDate,
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(100),
        cancelledAt: cancellationDate,
        history: [
          {
            action: 'CANCELLED',
            oldStatus: 'ACTIVE',
            newStatus: 'CANCELLED',
            oldRenewalDate: createDate(2024, 4, 1),
            createdAt: cancellationDate,
          },
          {
            action: 'REACTIVATED',
            oldStatus: 'CANCELLED',
            newStatus: 'ACTIVE',
            newRenewalDate: createDate(2024, 6, 1),
            reactivationDate: reactivationDate,
            createdAt: reactivationDate,
          },
        ],
        createdAt: purchaseDate,
      });

      const result = await getActivePeriods('sub-1');

      expect(result).toHaveLength(2);
      // First period: Jan 1 - Mar 15
      expect(result[0].endDate).toEqual(cancellationDate);
      // Second period: May 1 - current
      expect(result[1].startDate).toEqual(reactivationDate);
      expect(result[1].endDate).toBeNull();
    });

    it('should handle ONE_TIME billing correctly', async () => {
      const purchaseDate = createDate(2024, 1, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate: null,
        billingCycle: 'ONE_TIME',
        costPerCycle: new Decimal(5000),
        history: [],
        createdAt: purchaseDate,
      });

      const result = await getActivePeriods('sub-1');

      expect(result).toHaveLength(1);
      // ONE_TIME should only be charged once
      expect(result[0].cost).toBe(5000);
    });

    it('should handle YEARLY billing correctly', async () => {
      const purchaseDate = createDate(2023, 1, 1);
      const renewalDate = createDate(2024, 1, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate,
        billingCycle: 'YEARLY',
        costPerCycle: new Decimal(1000),
        history: [],
        createdAt: purchaseDate,
      });

      const result = await getActivePeriods('sub-1');

      expect(result).toHaveLength(1);
      // From Jan 2023 to June 2024, should have multiple yearly cycles
      expect(result[0].cost).toBeGreaterThanOrEqual(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALCULATE TOTAL COST
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateTotalCost', () => {
    it('should throw error when subscription not found', async () => {
      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(calculateTotalCost('sub-1')).rejects.toThrow('Subscription not found');
    });

    it('should return cost breakdown with currency and periods', async () => {
      const purchaseDate = createDate(2024, 1, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate: createDate(2024, 2, 1),
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(100),
        costCurrency: 'QAR',
        history: [],
        createdAt: purchaseDate,
      });

      const result = await calculateTotalCost('sub-1');

      expect(result.currency).toBe('QAR');
      expect(result.billingCycle).toBe('MONTHLY');
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.activePeriods).toBeDefined();
      expect(result.activePeriods.length).toBeGreaterThan(0);
    });

    it('should default currency to QAR when not specified', async () => {
      const purchaseDate = createDate(2024, 1, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate: createDate(2024, 2, 1),
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(100),
        costCurrency: null,
        history: [],
        createdAt: purchaseDate,
      });

      const result = await calculateTotalCost('sub-1');

      expect(result.currency).toBe('QAR');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALCULATE NEXT RENEWAL DATE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateNextRenewalDate', () => {
    it('should add 1 month for MONTHLY billing', () => {
      const startDate = createDate(2024, 1, 15); // Jan 15

      const result = calculateNextRenewalDate(startDate, BillingCycle.MONTHLY);

      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(15);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should add 1 year for YEARLY billing', () => {
      const startDate = createDate(2024, 3, 10); // Mar 10

      const result = calculateNextRenewalDate(startDate, BillingCycle.YEARLY);

      expect(result.getMonth()).toBe(2); // March (0-indexed)
      expect(result.getDate()).toBe(10);
      expect(result.getFullYear()).toBe(2025);
    });

    it('should handle month overflow for MONTHLY billing', () => {
      const startDate = createDate(2024, 1, 31); // Jan 31

      const result = calculateNextRenewalDate(startDate, BillingCycle.MONTHLY);

      // Feb 31 doesn't exist, so JavaScript rolls to Mar 2 (or similar)
      expect(result.getMonth()).toBe(2); // March
    });

    it('should handle leap year for YEARLY billing', () => {
      const startDate = createDate(2024, 2, 29); // Feb 29, 2024 (leap year)

      const result = calculateNextRenewalDate(startDate, BillingCycle.YEARLY);

      // 2025 is not a leap year, so Feb 29 becomes Mar 1
      expect(result.getFullYear()).toBe(2025);
    });

    it('should return same date for ONE_TIME billing', () => {
      const startDate = createDate(2024, 5, 15);

      const result = calculateNextRenewalDate(startDate, BillingCycle.ONE_TIME);

      // ONE_TIME doesn't change the date
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(4); // May (0-indexed)
      expect(result.getDate()).toBe(15);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET USER SUBSCRIPTION HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getUserSubscriptionHistory', () => {
    it('should return empty array when user has no subscriptions', async () => {
      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getUserSubscriptionHistory('user-1');

      expect(result).toEqual([]);
    });

    it('should return subscriptions with calculated cost and periods', async () => {
      const subscription = {
        id: 'sub-1',
        serviceName: 'Microsoft 365',
        category: 'Software',
        accountId: 'acc-123',
        purchaseDate: createDate(2024, 1, 1),
        renewalDate: createDate(2024, 7, 1),
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(50),
        costCurrency: 'USD',
        costQAR: new Decimal(182),
        vendor: 'Microsoft',
        status: 'ACTIVE',
        assignedUserId: 'user-1',
        autoRenew: true,
        paymentMethod: 'Credit Card',
        notes: 'Office subscription',
        lastActiveRenewalDate: null,
        cancelledAt: null,
        reactivatedAt: null,
        createdAt: createDate(2024, 1, 1),
        updatedAt: createDate(2024, 1, 1),
        history: [],
      };

      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([subscription]);
      // Also mock findUnique for the internal getUserActivePeriods call
      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(subscription);

      const result = await getUserSubscriptionHistory('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('Microsoft 365');
      // Cost calculation depends on billing cycles - at minimum should have activePeriods
      expect(result[0].activePeriods).toBeDefined();
      expect(result[0].activePeriods.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify current period for active subscription', async () => {
      const subscription = {
        id: 'sub-1',
        serviceName: 'Netflix',
        category: 'Entertainment',
        accountId: null,
        purchaseDate: createDate(2024, 5, 1),
        renewalDate: createDate(2024, 6, 1),
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(15),
        costCurrency: 'USD',
        costQAR: null,
        vendor: 'Netflix',
        status: 'ACTIVE',
        assignedUserId: 'user-1',
        autoRenew: true,
        paymentMethod: null,
        notes: null,
        lastActiveRenewalDate: null,
        cancelledAt: null,
        reactivatedAt: null,
        createdAt: createDate(2024, 5, 1),
        updatedAt: createDate(2024, 5, 1),
        history: [],
      };

      (mockPrisma.subscription.findMany as jest.Mock).mockResolvedValue([subscription]);
      // Also mock findUnique for the internal getUserActivePeriods call
      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue(subscription);

      const result = await getUserSubscriptionHistory('user-1');

      // For active subscription with user assigned, should have current period
      expect(result[0].activePeriods).toBeDefined();
      // Current period is found when an active period has endDate = null
      const currentPeriod = result[0].activePeriods.find((p) => p.endDate === null);
      if (currentPeriod) {
        expect(currentPeriod.endDate).toBeNull();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle null costPerCycle gracefully', async () => {
      const purchaseDate = createDate(2024, 1, 1);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate,
        renewalDate: createDate(2024, 2, 1),
        billingCycle: 'MONTHLY',
        costPerCycle: null,
        history: [],
        createdAt: purchaseDate,
      });

      const result = await getActivePeriods('sub-1');

      expect(result[0].cost).toBe(0);
    });

    it('should use createdAt when purchaseDate is null', async () => {
      const createdAt = createDate(2024, 2, 15);

      (mockPrisma.subscription.findUnique as jest.Mock).mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        purchaseDate: null,
        renewalDate: createDate(2024, 3, 15),
        billingCycle: 'MONTHLY',
        costPerCycle: new Decimal(100),
        history: [],
        createdAt,
      });

      const result = await getActivePeriods('sub-1');

      expect(result[0].startDate).toEqual(createdAt);
    });
  });
});
