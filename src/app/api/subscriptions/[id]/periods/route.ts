/**
 * @file route.ts
 * @description Subscription active billing periods endpoint
 * @module operations/subscriptions
 *
 * Features:
 * - List all active (billed) periods for a subscription
 * - Handles multiple periods from cancellation/reactivation cycles
 * - Calculates cost per period based on billing cycles elapsed
 * - Useful for detailed cost analysis and billing verification
 *
 * Endpoint:
 * - GET /api/subscriptions/[id]/periods (auth required)
 *
 * Security:
 * - Authenticated users only
 * - Tenant isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActivePeriods } from '@/features/subscriptions';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * GET /api/subscriptions/[id]/periods - Get active billing periods
 *
 * Returns array of all periods when the subscription was active and billing.
 * Each period has start date, end date (null if currently active), and cost
 * incurred during that period.
 *
 * Use Cases:
 * - Cost breakdown visualization
 * - Billing verification
 * - Understanding subscription usage history
 *
 * Period Calculation:
 * - Period starts at purchase date or reactivation date
 * - Period ends at cancellation date or continues (null end date)
 * - Cost calculated by counting billing cycles within period
 *
 * @param id - Subscription ID from URL path
 * @returns Array of active periods with dates and costs
 * @throws 404 if subscription not found
 *
 * @example
 * GET /api/subscriptions/sub_xyz123/periods
 * // Returns: {
 * //   periods: [
 * //     { startDate: "2024-01-01", endDate: "2024-03-15", cost: 300 },
 * //     { startDate: "2024-05-01", endDate: null, cost: 200 }
 * //   ]
 * // }
 */
async function getSubscriptionPeriodsHandler(_request: NextRequest, context: APIContext) {
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

    // Verify subscription belongs to tenant before getting periods
    const subscription = await db.subscription.findFirst({
      where: { id },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const periods = await getActivePeriods(id);

    return NextResponse.json({ periods });
}

export const GET = withErrorHandler(getSubscriptionPeriodsHandler, { requireAuth: true, requireModule: 'subscriptions' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
