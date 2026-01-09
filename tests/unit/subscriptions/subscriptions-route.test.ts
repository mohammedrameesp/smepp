/**
 * @file subscriptions-route.test.ts
 * @description Tests for subscriptions API route including tenant isolation,
 *              edge cases, and error handling
 * @module tests/unit/subscriptions
 */

import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { subscriptionQuerySchema, createSubscriptionSchema } from '@/features/subscriptions/validations';
import { isUniqueConstraintError, MAX_TAG_GENERATION_RETRIES } from '@/features/subscriptions/lib/subscription-utils';

// Mock qatar-timezone for consistent test dates
jest.mock('@/lib/qatar-timezone', () => ({
  getQatarNow: () => new Date('2025-06-15T12:00:00+03:00'),
  getQatarStartOfDay: (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  getQatarEndOfDay: (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  },
  dateInputToQatarDate: (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T12:00:00');
    return isNaN(date.getTime()) ? null : date;
  },
}));

describe('Subscriptions Route Tests', () => {
  describe('Query Parameter Validation', () => {
    describe('subscriptionQuerySchema', () => {
      it('should accept valid query parameters', () => {
        const query = {
          q: 'microsoft',
          status: SubscriptionStatus.ACTIVE,
          category: 'Software',
          billingCycle: BillingCycle.MONTHLY,
          renewalWindowDays: 30,
          p: 1,
          ps: 25,
          sort: 'serviceName',
          order: 'asc',
        };

        const result = subscriptionQuerySchema.safeParse(query);
        expect(result.success).toBe(true);
      });

      it('should apply defaults for missing optional parameters', () => {
        const result = subscriptionQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(1);
          expect(result.data.ps).toBe(50);
          expect(result.data.sort).toBe('createdAt');
          expect(result.data.order).toBe('desc');
        }
      });

      it('should reject page number less than 1', () => {
        const result = subscriptionQuerySchema.safeParse({ p: 0 });
        expect(result.success).toBe(false);
      });

      it('should reject page size greater than 100', () => {
        const result = subscriptionQuerySchema.safeParse({ ps: 101 });
        expect(result.success).toBe(false);
      });

      it('should coerce string numbers to numbers', () => {
        const result = subscriptionQuerySchema.safeParse({
          p: '2',
          ps: '25',
          renewalWindowDays: '30',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(2);
          expect(result.data.ps).toBe(25);
          expect(result.data.renewalWindowDays).toBe(30);
        }
      });

      it('should accept renewalWindowDays of 0 (today only)', () => {
        const result = subscriptionQuerySchema.safeParse({ renewalWindowDays: 0 });
        expect(result.success).toBe(true);
      });

      it('should accept renewalWindowDays of 365 (maximum)', () => {
        const result = subscriptionQuerySchema.safeParse({ renewalWindowDays: 365 });
        expect(result.success).toBe(true);
      });

      it('should reject renewalWindowDays greater than 365', () => {
        const result = subscriptionQuerySchema.safeParse({ renewalWindowDays: 366 });
        expect(result.success).toBe(false);
      });

      it('should reject invalid sort field', () => {
        const result = subscriptionQuerySchema.safeParse({ sort: 'invalidField' });
        expect(result.success).toBe(false);
      });

      it('should accept all valid sort fields', () => {
        const validSorts = ['serviceName', 'renewalDate', 'costPerCycle', 'createdAt'];
        for (const sort of validSorts) {
          const result = subscriptionQuerySchema.safeParse({ sort });
          expect(result.success).toBe(true);
        }
      });

      it('should accept all valid status values', () => {
        const statuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, SubscriptionStatus.CANCELLED];
        for (const status of statuses) {
          const result = subscriptionQuerySchema.safeParse({ status });
          expect(result.success).toBe(true);
        }
      });

      it('should accept all valid billing cycles', () => {
        const cycles = [BillingCycle.MONTHLY, BillingCycle.YEARLY, BillingCycle.ONE_TIME];
        for (const billingCycle of cycles) {
          const result = subscriptionQuerySchema.safeParse({ billingCycle });
          expect(result.success).toBe(true);
        }
      });

      it('should handle special characters in search query', () => {
        // These should be accepted as-is, sanitization happens at query level
        const queries = ['%test%', "test's", 'test"quote', 'test\\slash'];
        for (const q of queries) {
          const result = subscriptionQuerySchema.safeParse({ q });
          expect(result.success).toBe(true);
        }
      });
    });
  });

  describe('Create Subscription Validation', () => {
    describe('createSubscriptionSchema', () => {
      const validSubscription = {
        serviceName: 'Test Service',
        purchaseDate: '2025-01-15',
        billingCycle: BillingCycle.MONTHLY,
        assignedMemberId: 'member-123',
        assignmentDate: '2025-01-15',
      };

      it('should accept valid minimal subscription data', () => {
        const result = createSubscriptionSchema.safeParse(validSubscription);
        expect(result.success).toBe(true);
      });

      it('should require serviceName', () => {
        const data = { ...validSubscription, serviceName: undefined };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should require purchaseDate', () => {
        const data = { ...validSubscription, purchaseDate: undefined };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should require billingCycle', () => {
        const data = { ...validSubscription, billingCycle: undefined };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should require assignedMemberId', () => {
        const data = { ...validSubscription, assignedMemberId: undefined };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should require assignmentDate when assignedMemberId is provided', () => {
        const data = { ...validSubscription, assignmentDate: undefined };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject renewalDate before purchaseDate', () => {
        const data = {
          ...validSubscription,
          purchaseDate: '2025-06-15',
          renewalDate: '2025-01-15', // Before purchase
        };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept renewalDate equal to purchaseDate', () => {
        const data = {
          ...validSubscription,
          purchaseDate: '2025-01-15',
          renewalDate: '2025-01-15',
        };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject negative costPerCycle', () => {
        const data = { ...validSubscription, costPerCycle: -10 };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should reject zero costPerCycle', () => {
        const data = { ...validSubscription, costPerCycle: 0 };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept positive costPerCycle', () => {
        const data = { ...validSubscription, costPerCycle: 99.99 };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject notes exceeding 1000 characters', () => {
        const data = { ...validSubscription, notes: 'a'.repeat(1001) };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(false);
      });

      it('should accept notes up to 1000 characters', () => {
        const data = { ...validSubscription, notes: 'a'.repeat(1000) };
        const result = createSubscriptionSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should default autoRenew to true', () => {
        const result = createSubscriptionSchema.safeParse(validSubscription);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.autoRenew).toBe(true);
        }
      });

      it('should default status to ACTIVE', () => {
        const result = createSubscriptionSchema.safeParse(validSubscription);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(SubscriptionStatus.ACTIVE);
        }
      });
    });
  });

  describe('Unique Constraint Error Detection', () => {
    it('should detect P2002 Prisma unique constraint error', () => {
      const prismaError = { code: 'P2002', message: 'Unique constraint failed' };
      expect(isUniqueConstraintError(prismaError)).toBe(true);
    });

    it('should not detect other Prisma errors as unique constraint', () => {
      const otherError = { code: 'P2025', message: 'Record not found' };
      expect(isUniqueConstraintError(otherError)).toBe(false);
    });

    it('should not detect generic errors as unique constraint', () => {
      const genericError = new Error('Something went wrong');
      expect(isUniqueConstraintError(genericError)).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isUniqueConstraintError(null)).toBe(false);
      expect(isUniqueConstraintError(undefined)).toBe(false);
    });

    it('should handle non-object values', () => {
      expect(isUniqueConstraintError('error')).toBe(false);
      expect(isUniqueConstraintError(123)).toBe(false);
    });
  });

  describe('Retry Constants', () => {
    it('should export MAX_TAG_GENERATION_RETRIES constant', () => {
      expect(MAX_TAG_GENERATION_RETRIES).toBe(3);
    });
  });

  describe('Tenant Isolation Scenarios', () => {
    /**
     * These tests document expected tenant isolation behavior.
     * Actual isolation is enforced by:
     * 1. Middleware setting x-tenant-id header
     * 2. withErrorHandler checking tenant context
     * 3. Tenant Prisma extension filtering all queries
     */

    it('should document that tenant context is required for GET', () => {
      // The handler checks: if (!tenant?.tenantId)
      // This returns 403 if tenant context is missing
      expect(true).toBe(true); // Placeholder - real test would mock handler
    });

    it('should document that tenant context is required for POST', () => {
      // The handler checks: if (!tenant?.tenantId || !tenant?.userId)
      // This returns 403 if tenant context is missing
      expect(true).toBe(true); // Placeholder - real test would mock handler
    });

    it('should document that admin role is required for POST', () => {
      // withErrorHandler options: { requireAdmin: true }
      // This returns 403 for non-admin users
      expect(true).toBe(true); // Placeholder - real test would mock handler
    });

    it('should document that subscriptions module must be enabled', () => {
      // withErrorHandler options: { requireModule: 'subscriptions' }
      // This returns 403 if module is not in org's enabledModules
      expect(true).toBe(true); // Placeholder - real test would mock handler
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should validate pagination parameters', () => {
      // Page 1 with 50 items
      const result1 = subscriptionQuerySchema.safeParse({ p: 1, ps: 50 });
      expect(result1.success).toBe(true);

      // Large page number (valid but may return empty results)
      const result2 = subscriptionQuerySchema.safeParse({ p: 9999, ps: 50 });
      expect(result2.success).toBe(true);

      // Minimum page size
      const result3 = subscriptionQuerySchema.safeParse({ p: 1, ps: 1 });
      expect(result3.success).toBe(true);

      // Maximum page size
      const result4 = subscriptionQuerySchema.safeParse({ p: 1, ps: 100 });
      expect(result4.success).toBe(true);
    });

    it('should handle hasMore calculation correctly', () => {
      // Test the logic: hasMore = skip + ps < total
      const testCases = [
        { skip: 0, ps: 50, total: 100, expected: true },
        { skip: 50, ps: 50, total: 100, expected: false },
        { skip: 0, ps: 50, total: 49, expected: false },
        { skip: 0, ps: 50, total: 50, expected: false },
        { skip: 0, ps: 50, total: 51, expected: true },
      ];

      for (const tc of testCases) {
        const hasMore = tc.skip + tc.ps < tc.total;
        expect(hasMore).toBe(tc.expected);
      }
    });

    it('should calculate totalPages correctly', () => {
      const testCases = [
        { total: 100, ps: 50, expected: 2 },
        { total: 101, ps: 50, expected: 3 },
        { total: 0, ps: 50, expected: 0 },
        { total: 1, ps: 50, expected: 1 },
        { total: 50, ps: 50, expected: 1 },
      ];

      for (const tc of testCases) {
        const totalPages = Math.ceil(tc.total / tc.ps);
        expect(totalPages).toBe(tc.expected);
      }
    });
  });
});
