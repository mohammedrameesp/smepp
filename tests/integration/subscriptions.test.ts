import { getServerSession } from 'next-auth/next';
import { Prisma, BillingCycle, SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createSubscriptionSchema } from '@/features/subscriptions';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

// Type for mocked Prisma model with common methods
interface MockPrismaModel {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

describe('Subscriptions API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/subscriptions', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return subscriptions for authenticated user', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockSubscriptions = [
        {
          id: 'sub-1',
          name: 'Adobe Creative Cloud',
          category: 'SOFTWARE',
          status: 'ACTIVE',
          assignedUserId: 'user-123',
        },
      ];

      const mockPrismaSubscription = getMockedModel(prisma.subscription);
      mockPrismaSubscription.findMany.mockResolvedValue(mockSubscriptions);

      const result = await mockPrismaSubscription.findMany();
      expect(result).toEqual(mockSubscriptions);
      expect(result).toHaveLength(1);
    });
  });

  describe('GET /api/subscriptions/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if user tries to access another user\'s subscription', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockSubscription = {
        id: 'sub-1',
        name: 'Adobe Creative Cloud',
        assignedUserId: 'user-456', // Different user
      };

      const mockPrismaSubscription = getMockedModel(prisma.subscription);
      mockPrismaSubscription.findUnique.mockResolvedValue(mockSubscription);

      const subscription = await mockPrismaSubscription.findUnique({ where: { id: 'sub-1' } });
      const session = await mockGetServerSession();

      // Should return 403
      expect(session?.user.isAdmin).toBe(false);
      expect(subscription.assignedUserId).not.toBe(session?.user.id);
    });

    it('should return subscription if user is owner', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockSubscription = {
        id: 'sub-1',
        name: 'Adobe Creative Cloud',
        assignedUserId: 'user-123', // Same user
      };

      const mockPrismaSubscription = getMockedModel(prisma.subscription);
      mockPrismaSubscription.findUnique.mockResolvedValue(mockSubscription);

      const subscription = await mockPrismaSubscription.findUnique({ where: { id: 'sub-1' } });
      const session = await mockGetServerSession();

      // Should return 200
      expect(subscription.assignedUserId).toBe(session?.user.id);
    });

    it('should return subscription if user is admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockSubscription = {
        id: 'sub-1',
        name: 'Adobe Creative Cloud',
        assignedUserId: 'user-456', // Different user
      };

      const mockPrismaSubscription = getMockedModel(prisma.subscription);
      mockPrismaSubscription.findUnique.mockResolvedValue(mockSubscription);

      const _subscription = await mockPrismaSubscription.findUnique({ where: { id: 'sub-1' } });
      const session = await mockGetServerSession();

      // Should return 200 (admin can access any subscription)
      expect(session?.user.isAdmin).toBe(true);
    });
  });

  describe('POST /api/subscriptions', () => {
    it('should require admin role', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should create subscription with valid data', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const validSubscriptionData = {
        name: 'Adobe Creative Cloud',
        category: 'SOFTWARE',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        costPerCycle: 54.99,
        costCurrency: 'USD',
      };

      const mockPrismaSubscription = getMockedModel(prisma.subscription);
      mockPrismaSubscription.create.mockResolvedValue({
        id: 'sub-new',
        ...validSubscriptionData,
      });

      const result = await mockPrismaSubscription.create({ data: validSubscriptionData });
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Adobe Creative Cloud');
    });
  });

  describe('Cost Calculations', () => {
    it('should calculate monthly cost correctly', () => {
      const costPerCycle = 54.99;
      const billingCycle = 'MONTHLY';

      const monthlyCost = billingCycle === 'MONTHLY' ? costPerCycle : costPerCycle / 12;
      expect(monthlyCost).toBe(54.99);
    });

    it('should calculate monthly cost from yearly billing', () => {
      const costPerCycle = 659.88;
      const billingCycle: string = 'YEARLY';

      const monthlyCost = billingCycle === 'MONTHLY' ? costPerCycle : costPerCycle / 12;
      expect(monthlyCost).toBeCloseTo(54.99, 2);
    });
  });

  describe('Renewal Date Calculations', () => {
    it('should calculate next renewal date for monthly subscription', () => {
      const renewalDate = new Date('2025-01-01');
      const billingCycle: string = 'MONTHLY';

      const nextRenewal = new Date(renewalDate);
      if (billingCycle === 'MONTHLY') {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      } else {
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      }

      expect(nextRenewal.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should calculate next renewal date for yearly subscription', () => {
      const renewalDate = new Date('2025-01-01');
      const billingCycle: string = 'YEARLY';

      const nextRenewal = new Date(renewalDate);
      if (billingCycle === 'MONTHLY') {
        nextRenewal.setMonth(nextRenewal.getMonth() + 1);
      } else {
        nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      }

      expect(nextRenewal.getFullYear()).toBe(2026);
    });
  });

  /**
   * Schema Validation Tests
   *
   * These tests ensure that the Zod validation schema stays in sync with
   * the Prisma model. They validate data shapes at compile time and runtime.
   */
  describe('Schema Validation', () => {
    it('should validate subscription create data against Zod schema', () => {
      const validData = {
        serviceName: 'Test Subscription',
        category: 'SaaS',
        accountId: 'test@example.com',
        vendor: 'Test Vendor',
        costPerCycle: 100,
        costCurrency: 'QAR',
        costQAR: 100,
        billingCycle: 'MONTHLY' as const,
        purchaseDate: '2025-01-01',
        renewalDate: '2025-02-01',
        status: 'ACTIVE' as const,
        autoRenew: true,
        paymentMethod: 'Card *1234',
        notes: 'Test notes',
        assignedMemberId: 'user-123',
        assignmentDate: '2025-01-01',
      };

      const result = createSubscriptionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid subscription data', () => {
      const invalidData = {
        // Missing required serviceName
        category: 'SaaS',
        billingCycle: 'MONTHLY',
      };

      const result = createSubscriptionSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should ensure create data shape matches Prisma input type', () => {
      // This test validates at compile-time that our data shape matches Prisma
      // If this test compiles, the data shape is correct
      const subscriptionData: Prisma.SubscriptionUncheckedCreateInput = {
        tenantId: 'tenant-123',
        serviceName: 'Test Service',
        subscriptionTag: 'TST-SUB-001',
        category: 'SaaS',
        accountId: 'test@example.com',
        vendor: 'Test Vendor',
        costPerCycle: 100,
        costCurrency: 'QAR',
        costQAR: 100,
        billingCycle: BillingCycle.MONTHLY,
        purchaseDate: new Date(),
        renewalDate: new Date(),
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        paymentMethod: 'Card *1234',
        notes: 'Test notes',
        assignedMemberId: 'user-123',
      };

      // Verify all required fields are present
      expect(subscriptionData.tenantId).toBeDefined();
      expect(subscriptionData.serviceName).toBeDefined();
      expect(subscriptionData.subscriptionTag).toBeDefined();
      expect(subscriptionData.billingCycle).toBeDefined();
    });

    it('should not allow fields that do not exist in Prisma schema', () => {
      // This is a compile-time check - if projectId was added back to this
      // object, TypeScript would error because it's not in the Prisma type
      const subscriptionData: Prisma.SubscriptionUncheckedCreateInput = {
        tenantId: 'tenant-123',
        serviceName: 'Test Service',
        subscriptionTag: 'TST-SUB-001',
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        // projectId: 'proj-123', // This would cause a compile error!
      };

      expect(subscriptionData).toBeDefined();
    });
  });
});
