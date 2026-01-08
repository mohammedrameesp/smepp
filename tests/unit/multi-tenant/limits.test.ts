/**
 * @file limits.test.ts
 * @description Tests for tenant usage limits and enforcement
 */

import { prisma } from '@/lib/core/prisma';
import {
  getOrganizationUsage,
  getResourceUsage,
  checkLimit,
  checkMultipleLimits,
  getLimitWarnings,
  getOrganizationWithTier,
  hasActiveSubscription,
  type ResourceType,
} from '@/lib/multi-tenant/limits';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    teamMember: {
      count: jest.fn(),
    },
    asset: {
      count: jest.fn(),
    },
    subscription: {
      count: jest.fn(),
    },
    supplier: {
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Multi-tenant Limits Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrganizationUsage', () => {
    it('should return usage counts for all resource types', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(15);

      const result = await getOrganizationUsage('org-123');

      expect(result).toEqual({
        users: 10,
        assets: 50,
        subscriptions: 25,
        suppliers: 15,
      });
    });

    it('should filter users by tenantId and not deleted', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await getOrganizationUsage('org-123');

      expect(mockPrisma.teamMember.count).toHaveBeenCalledWith({
        where: { tenantId: 'org-123', isDeleted: false },
      });
    });

    it('should filter assets by tenantId', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(100);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await getOrganizationUsage('org-123');

      expect(mockPrisma.asset.count).toHaveBeenCalledWith({
        where: { tenantId: 'org-123' },
      });
    });

    it('should filter subscriptions by tenantId', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(30);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await getOrganizationUsage('org-123');

      expect(mockPrisma.subscription.count).toHaveBeenCalledWith({
        where: { tenantId: 'org-123' },
      });
    });

    it('should filter suppliers by tenantId', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(20);

      await getOrganizationUsage('org-123');

      expect(mockPrisma.supplier.count).toHaveBeenCalledWith({
        where: { tenantId: 'org-123' },
      });
    });

    it('should execute all count queries in parallel', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(15);

      await getOrganizationUsage('org-123');

      // All counts should be called
      expect(mockPrisma.teamMember.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.asset.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.subscription.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.supplier.count).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResourceUsage', () => {
    beforeEach(() => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(50);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(25);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(15);
    });

    it('should return usage info for users', async () => {
      const result = await getResourceUsage('org-123', 'users');

      expect(result).toEqual({
        current: 10,
        limit: -1, // Unlimited
        remaining: -1,
        isAtLimit: false,
        percentUsed: 0,
      });
    });

    it('should return usage info for assets', async () => {
      const result = await getResourceUsage('org-123', 'assets');

      expect(result).toEqual({
        current: 50,
        limit: -1,
        remaining: -1,
        isAtLimit: false,
        percentUsed: 0,
      });
    });

    it('should return usage info for subscriptions', async () => {
      const result = await getResourceUsage('org-123', 'subscriptions');

      expect(result).toEqual({
        current: 25,
        limit: -1,
        remaining: -1,
        isAtLimit: false,
        percentUsed: 0,
      });
    });

    it('should return usage info for suppliers', async () => {
      const result = await getResourceUsage('org-123', 'suppliers');

      expect(result).toEqual({
        current: 15,
        limit: -1,
        remaining: -1,
        isAtLimit: false,
        percentUsed: 0,
      });
    });

    it('should always return isAtLimit: false (limits disabled)', async () => {
      const resourceTypes: ResourceType[] = ['users', 'assets', 'subscriptions', 'suppliers'];

      for (const resourceType of resourceTypes) {
        const result = await getResourceUsage('org-123', resourceType);
        expect(result.isAtLimit).toBe(false);
      }
    });
  });

  describe('checkLimit', () => {
    it('should always return allowed: true (limits disabled)', async () => {
      const result = await checkLimit('org-123', 'users', 1);

      expect(result).toEqual({ allowed: true });
    });

    it('should return allowed for any resource type', async () => {
      const resourceTypes: ResourceType[] = ['users', 'assets', 'subscriptions', 'suppliers'];

      for (const resourceType of resourceTypes) {
        const result = await checkLimit('org-123', resourceType, 100);
        expect(result.allowed).toBe(true);
      }
    });

    it('should return allowed for any count to add', async () => {
      const result1 = await checkLimit('org-123', 'assets', 1);
      const result100 = await checkLimit('org-123', 'assets', 100);
      const result1000 = await checkLimit('org-123', 'assets', 1000);

      expect(result1.allowed).toBe(true);
      expect(result100.allowed).toBe(true);
      expect(result1000.allowed).toBe(true);
    });

    it('should use default countToAdd of 1 when not specified', async () => {
      const result = await checkLimit('org-123', 'users');

      expect(result.allowed).toBe(true);
    });
  });

  describe('checkMultipleLimits', () => {
    it('should return allAllowed: true for all checks', async () => {
      const result = await checkMultipleLimits('org-123', [
        { resourceType: 'users', countToAdd: 5 },
        { resourceType: 'assets', countToAdd: 10 },
        { resourceType: 'subscriptions', countToAdd: 3 },
      ]);

      expect(result.allAllowed).toBe(true);
    });

    it('should return allowed: true for each resource type', async () => {
      const result = await checkMultipleLimits('org-123', [
        { resourceType: 'users', countToAdd: 5 },
        { resourceType: 'assets', countToAdd: 10 },
      ]);

      expect(result.results.users).toEqual({ allowed: true });
      expect(result.results.assets).toEqual({ allowed: true });
    });

    it('should handle empty checks array', async () => {
      const result = await checkMultipleLimits('org-123', []);

      expect(result.allAllowed).toBe(true);
      expect(result.results).toEqual({});
    });

    it('should handle single check', async () => {
      const result = await checkMultipleLimits('org-123', [
        { resourceType: 'suppliers' },
      ]);

      expect(result.allAllowed).toBe(true);
      expect(result.results.suppliers).toEqual({ allowed: true });
    });
  });

  describe('getLimitWarnings', () => {
    it('should return empty array (limits disabled)', async () => {
      const result = await getLimitWarnings('org-123');

      expect(result).toEqual([]);
    });
  });

  describe('getOrganizationWithTier', () => {
    it('should return organization with tier info', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org',
        slug: 'test-org',
        subscriptionTier: 'FREE',
        maxUsers: -1,
        maxAssets: -1,
        stripeCustomerId: null,
        stripeSubEnd: null,
      };

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const result = await getOrganizationWithTier('org-123');

      expect(result).toEqual(mockOrg);
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-123' },
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionTier: true,
          maxUsers: true,
          maxAssets: true,
          stripeCustomerId: true,
          stripeSubEnd: true,
        },
      });
    });

    it('should return null for non-existent organization', async () => {
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getOrganizationWithTier('non-existent');

      expect(result).toBeNull();
    });

    it('should include Stripe subscription info', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Paid Org',
        slug: 'paid-org',
        subscriptionTier: 'PLUS',
        maxUsers: -1,
        maxAssets: -1,
        stripeCustomerId: 'cus_test123',
        stripeSubEnd: new Date('2025-01-01'),
      };

      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue(mockOrg);

      const result = await getOrganizationWithTier('org-123');

      expect(result?.stripeCustomerId).toBe('cus_test123');
      expect(result?.stripeSubEnd).toEqual(new Date('2025-01-01'));
    });
  });

  describe('hasActiveSubscription', () => {
    it('should always return true (tier restrictions disabled)', async () => {
      const result = await hasActiveSubscription('org-123');

      expect(result).toBe(true);
    });

    it('should return true for any organization', async () => {
      const result1 = await hasActiveSubscription('free-org');
      const result2 = await hasActiveSubscription('paid-org');
      const result3 = await hasActiveSubscription('expired-org');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });
  });

  describe('Resource Type Validation', () => {
    it('should support all resource types', async () => {
      const resourceTypes: ResourceType[] = ['users', 'assets', 'subscriptions', 'suppliers'];

      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(0);

      for (const resourceType of resourceTypes) {
        const result = await getResourceUsage('org-123', resourceType);
        expect(result.current).toBeDefined();
      }
    });
  });

  describe('UsageInfo Structure', () => {
    it('should return correct structure', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(0);

      const result = await getResourceUsage('org-123', 'users');

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('isAtLimit');
      expect(result).toHaveProperty('percentUsed');

      expect(typeof result.current).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.isAtLimit).toBe('boolean');
      expect(typeof result.percentUsed).toBe('number');
    });
  });

  describe('LimitCheckResult Structure', () => {
    it('should return correct structure for checkLimit', async () => {
      const result = await checkLimit('org-123', 'assets');

      expect(result).toHaveProperty('allowed');
      expect(typeof result.allowed).toBe('boolean');
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should filter all queries by organization ID', async () => {
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.asset.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.subscription.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.supplier.count as jest.Mock).mockResolvedValue(0);

      await getOrganizationUsage('specific-org-id');

      expect(mockPrisma.teamMember.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'specific-org-id' }),
        })
      );
      expect(mockPrisma.asset.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'specific-org-id' }),
        })
      );
      expect(mockPrisma.subscription.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'specific-org-id' }),
        })
      );
      expect(mockPrisma.supplier.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'specific-org-id' }),
        })
      );
    });
  });
});
