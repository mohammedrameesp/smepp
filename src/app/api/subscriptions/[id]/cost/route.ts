/**
 * @file route.ts
 * @description Subscription total cost calculation endpoint
 * @module operations/subscriptions
 *
 * Features:
 * - Calculate total cost across all active periods
 * - Handles cancellations and reactivations correctly
 * - Returns cost breakdown by period
 * - Supports all billing cycles (MONTHLY, YEARLY, ONE_TIME, etc.)
 *
 * Endpoint:
 * - GET /api/subscriptions/[id]/cost (auth required)
 *
 * Security:
 * - Authenticated users only
 * - Tenant isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTotalCost } from '@/features/subscriptions';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * GET /api/subscriptions/[id]/cost - Calculate total subscription cost
 *
 * Calculates total cost incurred across all active periods of a subscription,
 * properly handling cancellations and reactivations.
 *
 * Cost Calculation:
 * - For each active period, calculates cycles passed based on billing frequency
 * - MONTHLY: calculates months between start and end dates
 * - YEARLY: calculates years between start and end dates
 * - ONE_TIME: charges once at purchase
 * - Sums costs across all active periods
 *
 * @param id - Subscription ID from URL path
 * @returns Cost breakdown with currency, total, and period details
 * @throws 404 if subscription not found
 *
 * @example
 * GET /api/subscriptions/sub_xyz123/cost
 * // Returns: {
 * //   totalCost: 600,
 * //   currency: "QAR",
 * //   billingCycle: "MONTHLY",
 * //   activePeriods: [...]
 * // }
 */
async function getSubscriptionCostHandler(_request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma, params } = context;

    // Defensive check for tenant context
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;

    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Verify subscription belongs to tenant before calculating cost
    const subscription = await db.subscription.findFirst({
      where: { id },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const costBreakdown = await calculateTotalCost(id);

    return NextResponse.json(costBreakdown);
}

export const GET = withErrorHandler(getSubscriptionCostHandler, { requireAuth: true, requireModule: 'subscriptions' });
