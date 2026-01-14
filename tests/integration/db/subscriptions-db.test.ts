/**
 * @file subscriptions-db.test.ts
 * @description Integration tests for direct database operations
 *
 * These tests validate:
 * - Prisma schema matches actual database
 * - CRUD operations work correctly
 * - Data validation catches schema mismatches
 *
 * NOTE: These tests require a database WITHOUT Row Level Security (RLS).
 * Supabase production databases have RLS enabled which blocks direct Prisma access.
 *
 * For Supabase with RLS, use E2E tests instead which test through authenticated APIs.
 *
 * To run with a local PostgreSQL (no RLS):
 * 1. Set DATABASE_URL to local PostgreSQL
 * 2. Set TEST_TENANT_ID and TEST_USER_ID to valid IDs
 * 3. Run: npm run test:db
 */

// Use actual PrismaClient, not the mocked one
import { PrismaClient, Prisma, BillingCycle, SubscriptionStatus } from '@prisma/client';

// Use DATABASE_URL for testing
const testDbUrl = process.env.DATABASE_URL;

// Check database type - Supabase has RLS that blocks direct Prisma access
const isSupabase = testDbUrl?.includes('supabase');
const isLocalDb = testDbUrl?.includes('localhost');
const hasDatabase = !!testDbUrl;

// Test tenant/user IDs MUST be set via environment variables
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '';
const TEST_USER_ID = process.env.TEST_USER_ID || '';

// Only run if we have a local database (no RLS) AND valid test IDs
// Supabase databases have RLS which blocks direct Prisma access
const canRunTests = hasDatabase && !isSupabase && TEST_TENANT_ID && TEST_USER_ID;


// Create a fresh prisma client for database tests (bypasses Jest mock)
const prismaClient = canRunTests ? new PrismaClient({
  datasources: {
    db: {
      url: testDbUrl,
    },
  },
}) : null;

// Helper to get prisma client with type assertion (only used in tests that run when canRunTests is true)
const getPrisma = () => prismaClient as PrismaClient;

// Track created records for cleanup
const createdSubscriptionIds: string[] = [];

describe('Subscription Database Integration Tests', () => {
  // Skip entire suite if no real database
  beforeAll(() => {
    if (!canRunTests) {
      console.warn('⚠️  Skipping database integration tests');
      if (isSupabase) {
        console.warn('   - Supabase RLS blocks direct Prisma access');
        console.warn('   - Use E2E tests for Supabase database testing');
      } else if (!hasDatabase) {
        console.warn('   - DATABASE_URL not set');
      }
      if (!TEST_TENANT_ID || !TEST_USER_ID) {
        console.warn('   - TEST_TENANT_ID and/or TEST_USER_ID not set');
      }
    }
  });

  afterAll(async () => {
    if (!prismaClient) return;

    // Clean up test data
    if (createdSubscriptionIds.length > 0) {
      try {
        await getPrisma().subscription.deleteMany({
          where: {
            id: { in: createdSubscriptionIds }
          }
        });
        console.log(`Cleaned up ${createdSubscriptionIds.length} test subscriptions`);
      } catch (error) {
        console.error('Failed to clean up test data:', error);
      }
    }
    await prismaClient.$disconnect();
  });

  // Only run these tests if we have a real database connection AND valid test IDs
  const itIfDb = canRunTests ? it : it.skip;

  describe('Schema Validation', () => {
    itIfDb('should create subscription with valid Prisma schema fields', async () => {
      const subscriptionData: Prisma.SubscriptionUncheckedCreateInput = {
        tenantId: TEST_TENANT_ID,
        serviceName: `DB Test ${Date.now()}`,
        subscriptionTag: `TEST-SUB-${Date.now()}`,
        category: 'Test Category',
        accountId: 'test@example.com',
        vendor: 'Test Vendor',
        costPerCycle: 100,
        costCurrency: 'QAR',
        costQAR: 100,
        billingCycle: BillingCycle.MONTHLY,
        purchaseDate: new Date(),
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        paymentMethod: 'Card *1234',
        notes: 'Test subscription for DB integration tests',
        assignedMemberId: TEST_USER_ID,
      };

      const subscription = await getPrisma().subscription.create({
        data: subscriptionData,
      });

      createdSubscriptionIds.push(subscription.id);

      expect(subscription.id).toBeDefined();
      expect(subscription.serviceName).toBe(subscriptionData.serviceName);
      expect(subscription.tenantId).toBe(TEST_TENANT_ID);
    });

    itIfDb('should reject invalid fields not in Prisma schema', async () => {
      // This test verifies that adding unknown fields causes an error
      const invalidData = {
        tenantId: TEST_TENANT_ID,
        serviceName: `Invalid Test ${Date.now()}`,
        subscriptionTag: `TEST-INV-${Date.now()}`,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        // This field was removed from schema - should cause error
        projectId: 'some-project-id',
      };

      await expect(
        getPrisma().subscription.create({
          data: invalidData as Prisma.SubscriptionUncheckedCreateInput,
        })
      ).rejects.toThrow();
    });

    itIfDb('should create subscription without optional fields', async () => {
      // Minimum required fields only
      const minimalData: Prisma.SubscriptionUncheckedCreateInput = {
        tenantId: TEST_TENANT_ID,
        serviceName: `Minimal Test ${Date.now()}`,
        subscriptionTag: `TEST-MIN-${Date.now()}`,
        billingCycle: BillingCycle.MONTHLY,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: false,
      };

      const subscription = await getPrisma().subscription.create({
        data: minimalData,
      });

      createdSubscriptionIds.push(subscription.id);

      expect(subscription.id).toBeDefined();
      expect(subscription.costPerCycle).toBeNull();
      expect(subscription.category).toBeNull();
      expect(subscription.assignedMemberId).toBeNull();
    });
  });

  describe('CRUD Operations', () => {
    itIfDb('should read subscription by ID', async () => {
      // Create a subscription first
      const subscription = await getPrisma().subscription.create({
        data: {
          tenantId: TEST_TENANT_ID,
          serviceName: `Read Test ${Date.now()}`,
          subscriptionTag: `TEST-READ-${Date.now()}`,
          billingCycle: BillingCycle.YEARLY,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
        },
      });
      createdSubscriptionIds.push(subscription.id);

      // Read it back
      const found = await getPrisma().subscription.findUnique({
        where: { id: subscription.id },
      });

      expect(found).not.toBeNull();
      expect(found?.serviceName).toBe(subscription.serviceName);
    });

    itIfDb('should update subscription', async () => {
      // Create a subscription first
      const subscription = await getPrisma().subscription.create({
        data: {
          tenantId: TEST_TENANT_ID,
          serviceName: `Update Test ${Date.now()}`,
          subscriptionTag: `TEST-UPD-${Date.now()}`,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
          costPerCycle: 100,
        },
      });
      createdSubscriptionIds.push(subscription.id);

      // Update it
      const updated = await getPrisma().subscription.update({
        where: { id: subscription.id },
        data: {
          costPerCycle: 200,
          status: SubscriptionStatus.PAUSED,
        },
      });

      expect(updated.costPerCycle?.toNumber()).toBe(200);
      expect(updated.status).toBe(SubscriptionStatus.PAUSED);
    });

    itIfDb('should delete subscription', async () => {
      // Create a subscription first
      const subscription = await getPrisma().subscription.create({
        data: {
          tenantId: TEST_TENANT_ID,
          serviceName: `Delete Test ${Date.now()}`,
          subscriptionTag: `TEST-DEL-${Date.now()}`,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: false,
        },
      });

      // Delete it (don't add to cleanup array since we're deleting)
      await getPrisma().subscription.delete({
        where: { id: subscription.id },
      });

      // Verify it's gone
      const found = await getPrisma().subscription.findUnique({
        where: { id: subscription.id },
      });

      expect(found).toBeNull();
    });
  });

  describe('Query Operations', () => {
    itIfDb('should filter subscriptions by tenant', async () => {
      // Create subscriptions for test tenant
      const sub1 = await getPrisma().subscription.create({
        data: {
          tenantId: TEST_TENANT_ID,
          serviceName: `Filter Test 1 ${Date.now()}`,
          subscriptionTag: `TEST-FLT1-${Date.now()}`,
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: true,
        },
      });
      createdSubscriptionIds.push(sub1.id);

      const sub2 = await getPrisma().subscription.create({
        data: {
          tenantId: TEST_TENANT_ID,
          serviceName: `Filter Test 2 ${Date.now()}`,
          subscriptionTag: `TEST-FLT2-${Date.now()}`,
          billingCycle: BillingCycle.YEARLY,
          status: SubscriptionStatus.ACTIVE,
          autoRenew: false,
        },
      });
      createdSubscriptionIds.push(sub2.id);

      // Query by tenant
      const subscriptions = await getPrisma().subscription.findMany({
        where: { tenantId: TEST_TENANT_ID },
      });

      expect(subscriptions.length).toBeGreaterThanOrEqual(2);
      expect(subscriptions.every(s => s.tenantId === TEST_TENANT_ID)).toBe(true);
    });

    itIfDb('should sort subscriptions by status then renewalDate', async () => {
      // This tests the sorting logic we added for the subscription list
      const subscriptions = await getPrisma().subscription.findMany({
        where: { tenantId: TEST_TENANT_ID },
        orderBy: [
          { status: 'asc' }, // ACTIVE < CANCELLED < PAUSED
          { renewalDate: 'asc' },
        ],
        take: 10,
      });

      // Verify ACTIVE comes before other statuses
      let foundNonActive = false;
      for (const sub of subscriptions) {
        if (sub.status !== SubscriptionStatus.ACTIVE) {
          foundNonActive = true;
        }
        if (foundNonActive && sub.status === SubscriptionStatus.ACTIVE) {
          // ACTIVE should not appear after non-ACTIVE
          fail('ACTIVE subscription found after non-ACTIVE');
        }
      }

      expect(subscriptions).toBeDefined();
    });
  });
});
