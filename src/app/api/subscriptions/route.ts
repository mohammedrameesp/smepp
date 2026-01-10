/**
 * @file route.ts
 * @description Subscription list and creation endpoints
 * @module operations/subscriptions
 *
 * Features:
 * - Paginated subscription listing with filtering and search
 * - Advanced filtering: status, category, billing cycle, renewal window
 * - Multi-currency support with automatic QAR conversion
 * - Subscription creation with automatic history tracking
 * - Activity logging for audit trail
 *
 * Endpoints:
 * - GET /api/subscriptions - List subscriptions with filters (auth required)
 * - POST /api/subscriptions - Create new subscription (admin required)
 *
 * Security:
 * - Tenant isolation enforced via middleware
 * - Role-based access control (admin required for creation)
 * - Input validation via Zod schemas
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createSubscriptionSchema, subscriptionQuerySchema, generateSubscriptionTag, isUniqueConstraintError, MAX_TAG_GENERATION_RETRIES } from '@/features/subscriptions';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { getQatarNow, getQatarStartOfDay } from '@/lib/core/datetime';
import { parseInputDateString } from '@/lib/core/datetime';
import { convertToQAR } from '@/lib/core/currency';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * GET /api/subscriptions - Retrieve paginated list of subscriptions with filtering
 *
 * This handler provides a flexible subscription listing with:
 * - Full-text search across service name, account ID, vendor, and category
 * - Advanced filtering by status, category, billing cycle, project
 * - Renewal window filtering (e.g., "expiring in next 30 days")
 * - Pagination with configurable page size
 * - Sorting by any subscription field
 *
 * Query Parameters:
 * @param q - Search term (searches serviceName, accountId, vendor, category)
 * @param projectId - Filter by project ID
 * @param status - Filter by status (ACTIVE, CANCELLED, EXPIRED)
 * @param category - Filter by category
 * @param billingCycle - Filter by billing cycle (MONTHLY, YEARLY, etc.)
 * @param renewalWindowDays - Filter subscriptions renewing within N days
 * @param p - Page number (default: 1)
 * @param ps - Page size (default: 50)
 * @param sort - Sort field (default: serviceName)
 * @param order - Sort order (asc/desc, default: asc)
 *
 * @returns Paginated subscription list with member assignments
 *
 * @example
 * GET /api/subscriptions?q=microsoft&status=ACTIVE&renewalWindowDays=30&p=1&ps=20
 * // Returns: { subscriptions: [...], pagination: { page: 1, total: 45, ... } }
 */
async function getSubscriptionsHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    // Defensive check for tenant context (should always be present due to requireAuth)
    if (!tenant?.tenantId) {
      return NextResponse.json({
        error: 'Tenant context required',
      }, { status: 403 });
    }

    // Cast to tenant-scoped prisma client for type safety
    const db = tenantPrisma as TenantPrismaClient;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = subscriptionQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { q, projectId, status, category, billingCycle, renewalWindowDays, p, ps, sort, order } = validation.data;

    // Build where clause using reusable search filter
    // Note: tenantId filtering is handled automatically by tenant-scoped prisma client
    const filters: Record<string, unknown> = {};

    if (projectId) filters.projectId = projectId;
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (billingCycle) filters.billingCycle = billingCycle;

    if (renewalWindowDays !== undefined) {
      // Calculate renewal window using Qatar timezone
      const now = getQatarStartOfDay(getQatarNow());
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + renewalWindowDays);
      filters.renewalDate = {
        lte: targetDate,
        gte: now,
      };
    }

    const where = buildFilterWithSearch({
      searchTerm: q,
      searchFields: ['serviceName', 'accountId', 'vendor', 'category'],
      filters,
    });

    // Calculate pagination
    const skip = (p - 1) * ps;

    // Fetch subscriptions using tenant-scoped prisma (auto-filters by tenantId)
    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        orderBy: { [sort]: order },
        take: ps,
        skip,
        include: {
          assignedMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.subscription.count({ where }),
    ]);

    return NextResponse.json({
      subscriptions,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
}

/**
 * POST /api/subscriptions - Create a new subscription
 *
 * This handler creates a subscription with the following features:
 * - Automatic QAR conversion for multi-currency support
 * - Currency defaults to QAR if not specified
 * - Activity logging for audit trail
 * - Subscription history tracking from creation
 * - Optional member assignment with assignment date
 *
 * IMPORTANT: costQAR is always calculated to prevent data loss. If costPerCycle
 * and costCurrency are provided but costQAR is missing, automatic conversion
 * is performed using the latest exchange rates.
 *
 * Request Body:
 * @param serviceName - Name of the service/subscription (required)
 * @param category - Service category (e.g., "Software", "Cloud")
 * @param vendor - Service vendor/provider
 * @param accountId - Account/license identifier
 * @param costPerCycle - Cost amount in original currency
 * @param costCurrency - Currency code (defaults to QAR)
 * @param costQAR - Pre-calculated QAR amount (auto-calculated if missing)
 * @param billingCycle - Billing frequency (MONTHLY, YEARLY, etc.)
 * @param purchaseDate - Date of purchase/activation
 * @param renewalDate - Next renewal date
 * @param assignedMemberId - Team member ID to assign to
 * @param assignmentDate - Date of assignment (for history tracking)
 * @param status - Subscription status (default: ACTIVE)
 * @param autoRenew - Whether subscription auto-renews
 * @param paymentMethod - Payment method used
 * @param notes - Additional notes
 *
 * @returns Created subscription with 201 status
 *
 * @example
 * POST /api/subscriptions
 * Body: {
 *   serviceName: "Microsoft 365",
 *   category: "Software",
 *   vendor: "Microsoft",
 *   costPerCycle: 50,
 *   costCurrency: "USD",
 *   billingCycle: "MONTHLY",
 *   assignedMemberId: "member-123"
 * }
 * // Returns: { id: "sub-xyz", costQAR: 182, ... }
 */
async function createSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    // Defensive check for tenant context (should always be present due to requireAdmin)
    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({
        error: 'Tenant context required',
      }, { status: 403 });
    }

    const { tenantId, userId: currentUserId } = tenant;

    // Cast to tenant-scoped prisma client for type safety
    const db = tenantPrisma as TenantPrismaClient;

    // Parse and validate request body
    const body = await request.json();
    const validation = createSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Get organization prefix for tag generation
    const orgPrefix = await getOrganizationCodePrefix(tenantId);

    // SAFEGUARD: Always calculate costQAR to prevent data loss
    let costQAR = data.costQAR;

    // Default currency to QAR if not specified
    const currency = data.costCurrency || 'QAR';

    if (data.costPerCycle && !costQAR) {
      // Convert to QAR using multi-currency support (supports ALL configured currencies)
      costQAR = await convertToQAR(data.costPerCycle, currency, tenantId);
    }

    // Extract assignmentDate - only used for history tracking, not stored on subscription
    const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : null;

    // Create subscription with retry logic for tag collision handling
    // The unique constraint [tenantId, subscriptionTag] prevents duplicates
    let subscription;
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_TAG_GENERATION_RETRIES; attempt++) {
      try {
        // Generate subscription tag with offset for retry attempts
        const subscriptionTag = await generateSubscriptionTag(tenantId, orgPrefix, attempt);

        // Build subscription data with proper typing
        // Note: tenantId is included explicitly for type safety, the tenant prisma
        // extension also auto-injects it but TypeScript requires it at compile time
        const subscriptionData = {
          tenantId,
          serviceName: data.serviceName,
          subscriptionTag,
          category: data.category ?? null,
          accountId: data.accountId ?? null,
          vendor: data.vendor ?? null,
          costPerCycle: data.costPerCycle ?? null,
          costCurrency: currency,
          costQAR: costQAR ?? null,
          billingCycle: data.billingCycle,
          purchaseDate: data.purchaseDate ? parseInputDateString(data.purchaseDate) : null,
          renewalDate: data.renewalDate ? parseInputDateString(data.renewalDate) : null,
          status: data.status,
          autoRenew: data.autoRenew,
          paymentMethod: data.paymentMethod ?? null,
          notes: data.notes ?? null,
          projectId: data.projectId ?? null,
          assignedMemberId: data.assignedMemberId,
        };

        // Create subscription using tenant-scoped prisma
        subscription = await db.subscription.create({
          data: subscriptionData,
          include: {
            assignedMember: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Success - break out of retry loop
        break;
      } catch (error) {
        lastError = error;

        // If it's a unique constraint violation on subscriptionTag, retry with new tag
        if (isUniqueConstraintError(error) && attempt < MAX_TAG_GENERATION_RETRIES) {
          continue;
        }

        // For other errors or max retries exceeded, throw
        throw error;
      }
    }

    // This should never happen due to throw above, but TypeScript needs it
    if (!subscription) {
      throw lastError || new Error('Failed to create subscription after retries');
    }

    // Log activity
    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.SUBSCRIPTION_CREATED,
      'Subscription',
      subscription.id,
      { serviceName: subscription.serviceName, subscriptionTag: subscription.subscriptionTag, billingCycle: subscription.billingCycle }
    );

    // Create subscription history entry for creation
    // Note: SubscriptionHistory doesn't have tenantId field, isolation is via subscriptionId FK
    await prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: 'CREATED',
        newStatus: subscription.status,
        performedById: currentUserId,
        assignmentDate: subscription.assignedMemberId ? assignmentDate : null,
        newMemberId: subscription.assignedMemberId,
      },
    });

    return NextResponse.json(subscription, { status: 201 });
}

export const GET = withErrorHandler(getSubscriptionsHandler, { requireAuth: true, requireModule: 'subscriptions' });
export const POST = withErrorHandler(createSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });