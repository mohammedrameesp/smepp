/**
 * @file route.ts
 * @description Permanently delete a subscription (no recovery possible)
 * @module api/subscriptions/[id]/permanent-delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { logAction, ActivityActions } from '@/lib/core/activity';

/**
 * Permanently delete a subscription from trash.
 * This action is irreversible and cascades to all related records.
 *
 * @route DELETE /api/subscriptions/[id]/permanent-delete
 *
 * @param {string} id - Subscription ID (path parameter)
 *
 * @returns {{ message: string }} Success message
 *
 * @throws {403} Tenant context required
 * @throws {400} ID is required / Subscription is not in trash
 * @throws {404} Subscription not found
 */
async function permanentDeleteHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Only allow permanent deletion of already soft-deleted subscriptions
  const subscription = await db.subscription.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, serviceName: true, subscriptionTag: true },
  });

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found in trash. Use regular delete first.' }, { status: 404 });
  }

  // Permanently delete (cascades to history)
  await db.subscription.delete({
    where: { id },
  });

  // Log permanent deletion
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.SUBSCRIPTION_DELETED,
    'Subscription',
    subscription.id,
    { serviceName: subscription.serviceName, subscriptionTag: subscription.subscriptionTag, permanentDelete: true }
  );

  return NextResponse.json({
    message: 'Subscription permanently deleted',
  });
}

export const DELETE = withErrorHandler(permanentDeleteHandler, { requireAdmin: true, requireModule: 'subscriptions' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
