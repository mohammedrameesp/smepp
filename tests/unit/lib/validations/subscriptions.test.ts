/**
 * Tests for Subscription Validation Schemas
 * @see src/lib/validations/subscriptions.ts
 */

import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  subscriptionQuerySchema,
} from '@/lib/validations/subscriptions';

// Mock the qatar-timezone module
jest.mock('@/lib/qatar-timezone', () => ({
  getQatarNow: () => new Date('2025-06-15T12:00:00Z'),
  getQatarEndOfDay: (date: Date) => {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  },
  dateInputToQatarDate: (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T12:00:00');
    return isNaN(date.getTime()) ? null : date;
  },
}));

describe('Subscription Validation Schemas', () => {
  describe('createSubscriptionSchema', () => {
    it('should validate a complete valid subscription', () => {
      const validSubscription = {
        serviceName: 'Adobe Creative Cloud',
        category: 'Software',
        accountId: 'ACC-12345',
        purchaseDate: '2024-01-15',
        renewalDate: '2025-01-15',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 599.99,
        costCurrency: 'USD',
        costQAR: 2184,
        vendor: 'Adobe Inc.',
        status: SubscriptionStatus.ACTIVE,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
        autoRenew: true,
        paymentMethod: 'Credit Card',
        notes: 'Team license',
      };

      const result = createSubscriptionSchema.safeParse(validSubscription);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields', () => {
      const minimalSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(minimalSubscription);
      expect(result.success).toBe(true);
    });

    it('should fail when serviceName is missing', () => {
      const invalidSubscription = {
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('serviceName'))).toBe(true);
      }
    });

    it('should fail when serviceName is empty', () => {
      const invalidSubscription = {
        serviceName: '',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail when serviceName exceeds 255 characters', () => {
      const invalidSubscription = {
        serviceName: 'A'.repeat(256),
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail when purchaseDate is missing', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail when billingCycle is missing', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid billingCycle', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: 'WEEKLY',
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should validate all billing cycle options', () => {
      const billingCycles = [BillingCycle.MONTHLY, BillingCycle.YEARLY, BillingCycle.ONE_TIME];

      billingCycles.forEach(cycle => {
        const subscription = {
          serviceName: 'Test Service',
          purchaseDate: '2024-01-15',
          billingCycle: cycle,
          assignedUserId: 'user-123',
          assignmentDate: '2024-01-15',
        };

        const result = createSubscriptionSchema.safeParse(subscription);
        expect(result.success).toBe(true);
      });
    });

    it('should fail when costPerCycle is negative', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: -10,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail when costPerCycle is zero', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 0,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid status', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        status: 'EXPIRED',
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should validate all status options', () => {
      const statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED];

      statuses.forEach(status => {
        const subscription = {
          serviceName: 'Test Service',
          purchaseDate: '2024-01-15',
          billingCycle: BillingCycle.MONTHLY,
          status,
          assignedUserId: 'user-123',
          assignmentDate: '2024-01-15',
        };

        const result = createSubscriptionSchema.safeParse(subscription);
        expect(result.success).toBe(true);
      });
    });

    it('should fail when assignedUserId is missing', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail when assignmentDate is missing but assignedUserId is provided', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        // Missing assignmentDate
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should fail when renewalDate is before purchaseDate', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-06-15',
        renewalDate: '2024-01-15', // Before purchase
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-06-15',
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should accept null/empty optional fields', () => {
      const subscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
        category: null,
        accountId: null,
        vendor: null,
        notes: null,
      };

      const result = createSubscriptionSchema.safeParse(subscription);
      expect(result.success).toBe(true);
    });

    it('should fail when notes exceed 1000 characters', () => {
      const invalidSubscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
        notes: 'A'.repeat(1001),
      };

      const result = createSubscriptionSchema.safeParse(invalidSubscription);
      expect(result.success).toBe(false);
    });

    it('should default autoRenew to true', () => {
      const subscription = {
        serviceName: 'Slack',
        purchaseDate: '2024-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedUserId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createSubscriptionSchema.safeParse(subscription);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.autoRenew).toBe(true);
      }
    });
  });

  describe('updateSubscriptionSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        serviceName: 'Updated Service Name',
        costPerCycle: 99.99,
      };

      const result = updateSubscriptionSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only status', () => {
      const statusUpdate = {
        status: SubscriptionStatus.PAUSED,
      };

      const result = updateSubscriptionSchema.safeParse(statusUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateSubscriptionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate serviceName length on update', () => {
      const invalidUpdate = {
        serviceName: 'A'.repeat(256),
      };

      const result = updateSubscriptionSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('subscriptionQuerySchema', () => {
    it('should validate empty query (use defaults)', () => {
      const result = subscriptionQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(50);
        expect(result.data.sort).toBe('createdAt');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should validate search query with filters', () => {
      const query = {
        q: 'adobe',
        status: SubscriptionStatus.ACTIVE,
        category: 'Software',
        billingCycle: BillingCycle.YEARLY,
        renewalWindowDays: 30,
        p: 2,
        ps: 25,
      };

      const result = subscriptionQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should coerce page and pageSize from strings', () => {
      const query = {
        p: '3',
        ps: '25',
      };

      const result = subscriptionQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(3);
        expect(result.data.ps).toBe(25);
      }
    });

    it('should fail with invalid page number', () => {
      const query = {
        p: 0,
      };

      const result = subscriptionQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should fail with page size over 100', () => {
      const query = {
        ps: 101,
      };

      const result = subscriptionQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate renewalWindowDays range', () => {
      const validQuery = subscriptionQuerySchema.safeParse({ renewalWindowDays: 30 });
      expect(validQuery.success).toBe(true);

      const zeroQuery = subscriptionQuerySchema.safeParse({ renewalWindowDays: 0 });
      expect(zeroQuery.success).toBe(true);

      const maxQuery = subscriptionQuerySchema.safeParse({ renewalWindowDays: 365 });
      expect(maxQuery.success).toBe(true);

      const invalidQuery = subscriptionQuerySchema.safeParse({ renewalWindowDays: 366 });
      expect(invalidQuery.success).toBe(false);
    });

    it('should validate sort options', () => {
      const validSorts = ['serviceName', 'renewalDate', 'costPerCycle', 'createdAt'];

      validSorts.forEach(sort => {
        const result = subscriptionQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid sort option', () => {
      const query = {
        sort: 'invalidField',
      };

      const result = subscriptionQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
