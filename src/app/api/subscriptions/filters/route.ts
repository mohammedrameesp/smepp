/**
 * @file route.ts
 * @description Subscription filter options API - returns dynamic category and billing cycle options
 * @module api/subscriptions/filters
 *
 * Returns categories and billing cycles that have at least one subscription,
 * sorted by count (most subscriptions first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { prisma as globalPrisma } from '@/lib/core/prisma';

async function getHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;

  // Get categories with counts using raw query for better performance
  const categoryGroups = await globalPrisma.$queryRaw<{ category: string; count: bigint }[]>`
    SELECT category, COUNT(*) as count
    FROM "Subscription"
    WHERE "tenantId" = ${tenantId} AND category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
    LIMIT 20
  `;

  // Get billing cycles with counts
  const billingCycleGroups = await globalPrisma.$queryRaw<{ billingCycle: string; count: bigint }[]>`
    SELECT "billingCycle", COUNT(*) as count
    FROM "Subscription"
    WHERE "tenantId" = ${tenantId}
    GROUP BY "billingCycle"
    ORDER BY count DESC
  `;

  return NextResponse.json({
    categories: categoryGroups.map((g) => ({
      category: g.category,
      count: Number(g.count),
    })),
    billingCycles: billingCycleGroups.map((g) => ({
      billingCycle: g.billingCycle,
      count: Number(g.count),
    })),
  });
}

export const GET = withErrorHandler(getHandler, { requireAuth: true, requireModule: 'subscriptions' });
