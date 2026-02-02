/**
 * @file route.ts
 * @description API for managing deleted (trashed) subscriptions
 * @module api/subscriptions/deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * Get all soft-deleted subscriptions (trash).
 *
 * @route GET /api/subscriptions/deleted
 *
 * @returns {{ subscriptions: Subscription[], count: number }} Deleted subscriptions with recovery deadline
 */
async function getDeletedSubscriptionsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const subscriptions = await db.subscription.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      subscriptionTag: true,
      serviceName: true,
      vendor: true,
      category: true,
      status: true,
      billingCycle: true,
      costPerCycle: true,
      costCurrency: true,
      deletedAt: true,
      deletedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Add recovery deadline (7 days from deletion)
  const subscriptionsWithDeadline = subscriptions.map(subscription => ({
    ...subscription,
    recoveryDeadline: subscription.deletedAt
      ? new Date(new Date(subscription.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null,
    daysRemaining: subscription.deletedAt
      ? Math.max(0, Math.ceil((new Date(subscription.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0,
  }));

  return NextResponse.json({
    subscriptions: subscriptionsWithDeadline,
    count: subscriptions.length,
  });
}

export const GET = withErrorHandler(getDeletedSubscriptionsHandler, { requireAdmin: true, requireModule: 'subscriptions' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
