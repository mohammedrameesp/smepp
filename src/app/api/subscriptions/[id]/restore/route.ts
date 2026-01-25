/**
 * @file route.ts
 * @description Restore soft-deleted subscription from trash
 * @module api/subscriptions/[id]/restore
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { logAction, ActivityActions } from '@/lib/core/activity';

/**
 * Restore a soft-deleted subscription from trash.
 *
 * @route POST /api/subscriptions/[id]/restore
 *
 * @param {string} id - Subscription ID (path parameter)
 *
 * @returns {{ message: string, subscription: Subscription }} Restored subscription
 *
 * @throws {403} Tenant context required
 * @throws {400} ID is required
 * @throws {404} Subscription not found or not deleted
 */
async function restoreSubscriptionHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Find deleted subscription
  const subscription = await db.subscription.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, serviceName: true, subscriptionTag: true, deletedAt: true },
  });

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found or not in trash' }, { status: 404 });
  }

  // Restore subscription (clear deletedAt and deletedById)
  const restoredSubscription = await db.subscription.update({
    where: { id },
    data: {
      deletedAt: null,
      deletedById: null,
    },
    select: {
      id: true,
      subscriptionTag: true,
      serviceName: true,
      vendor: true,
      status: true,
      billingCycle: true,
    },
  });

  // Log restoration
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.SUBSCRIPTION_UPDATED,
    'Subscription',
    subscription.id,
    { serviceName: subscription.serviceName, subscriptionTag: subscription.subscriptionTag, action: 'restored' }
  );

  return NextResponse.json({
    message: 'Subscription restored successfully',
    subscription: restoredSubscription,
  });
}

export const POST = withErrorHandler(restoreSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });
