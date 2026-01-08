/**
 * @file route.ts
 * @description Single subscription CRUD operations endpoint
 * @module operations/subscriptions
 *
 * Features:
 * - Retrieve subscription details with history
 * - Update subscription with multi-currency support
 * - Delete subscription with cascade handling
 * - Automatic assignment history tracking
 * - IDOR protection via tenant validation
 *
 * Endpoints:
 * - GET /api/subscriptions/[id] - Get subscription details (auth required)
 * - PUT /api/subscriptions/[id] - Update subscription (admin required)
 * - DELETE /api/subscriptions/[id] - Delete subscription (admin required)
 *
 * Security:
 * - Tenant isolation enforced on all operations
 * - Role-based access: only admins or assigned member can view
 * - Activity logging for all mutations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { updateSubscriptionSchema } from '@/features/subscriptions';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { parseInputDateString } from '@/lib/date-format';
import { convertToQAR } from '@/lib/core/currency';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/subscriptions/[id] - Retrieve subscription details
 *
 * Returns complete subscription information including:
 * - All subscription fields (service, cost, billing, dates)
 * - Assigned member details (if assigned)
 * - Recent history (last 10 entries) ordered by most recent
 *
 * Authorization:
 * - Admins can view any subscription in their tenant
 * - Regular users can only view subscriptions assigned to them
 *
 * IDOR Protection:
 * Uses findFirst with tenantId check to prevent cross-tenant access
 *
 * @param id - Subscription ID from URL path
 * @returns Subscription object with history and member details
 * @throws 404 if subscription not found in tenant
 * @throws 403 if user not authorized to view this subscription
 *
 * @example
 * GET /api/subscriptions/sub_xyz123
 * // Returns: { id: "sub_xyz123", serviceName: "...", history: [...], ... }
 */
async function getSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent IDOR attacks
    const subscription = await prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        assignedMember: {
          select: { id: true, name: true, email: true },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Authorization check: Only owners/admins or the assigned member can view the subscription
    const isOwnerOrAdmin = tenant!.orgRole === 'OWNER' || tenant!.orgRole === 'ADMIN';
    if (!isOwnerOrAdmin && subscription.assignedMemberId !== tenant!.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(subscription);
}

/**
 * PUT /api/subscriptions/[id] - Update subscription
 *
 * Handles partial or complete subscription updates with intelligent features:
 * - Automatic QAR recalculation when cost or currency changes
 * - Assignment history tracking with custom assignment dates
 * - Retroactive assignment date updates for existing assignments
 * - Activity logging for audit trail
 *
 * Cost Handling Logic:
 * 1. If costPerCycle changes: recalculate costQAR using current/new currency
 * 2. If only currency changes: recalculate costQAR using current costPerCycle
 * 3. costQAR always calculated to prevent data loss
 *
 * Assignment History Tracking:
 * - Member change: Creates new REASSIGNED history entry with assignment date
 * - Date-only change: Updates existing assignment history record
 *
 * @param id - Subscription ID from URL path
 * @param body - Partial subscription update (validated by updateSubscriptionSchema)
 * @param body.assignmentDate - Optional assignment date (for history tracking, not stored on subscription)
 *
 * @returns Updated subscription with member details
 * @throws 404 if subscription not found in tenant
 *
 * @example
 * PUT /api/subscriptions/sub_xyz123
 * Body: {
 *   costPerCycle: 100,
 *   costCurrency: "EUR",
 *   assignedMemberId: "member-456",
 *   assignmentDate: "2024-01-15"
 * }
 * // Returns: { id: "sub_xyz123", costQAR: 400, assignedMember: {...} }
 */
async function updateSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Get current subscription within tenant
    const currentSubscription = await prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        assignedMember: { select: { id: true, name: true, email: true } },
      },
    });

    if (!currentSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // SAFEGUARD: Always calculate costQAR to prevent data loss
    let costQAR = data.costQAR;

    // If costPerCycle is being updated, ensure costQAR is calculated
    if (data.costPerCycle !== undefined) {
      const costPerCycle = data.costPerCycle;
      const currency = data.costCurrency !== undefined ? data.costCurrency : currentSubscription.costCurrency;

      if (costPerCycle && !costQAR) {
        // Convert to QAR using multi-currency support
        costQAR = await convertToQAR(costPerCycle, currency || 'QAR', tenantId);
      }
    }

    // If only currency is changing, recalculate costQAR
    if (data.costCurrency !== undefined && data.costCurrency !== null && data.costPerCycle === undefined) {
      const currentCost = currentSubscription.costPerCycle ? Number(currentSubscription.costPerCycle) : 0;
      if (currentCost > 0) {
        // Convert to QAR using multi-currency support
        costQAR = await convertToQAR(currentCost, data.costCurrency, tenantId);
      }
    }

    const updateData: any = { ...data };

    // Ensure costQAR is set if calculated
    if (costQAR !== undefined) {
      updateData.costQAR = costQAR;
    }

    // Remove assignmentDate as it's only used for history tracking, not stored on the subscription
    delete updateData.assignmentDate;

    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? parseInputDateString(data.purchaseDate) : null;
    }
    if (data.renewalDate !== undefined) {
      updateData.renewalDate = data.renewalDate ? parseInputDateString(data.renewalDate) : null;
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: updateData,
      include: {
        assignedMember: { select: { id: true, name: true, email: true } },
      },
    });

    // Track member assignment changes in history with custom date
    if (data.assignedMemberId !== undefined && data.assignedMemberId !== currentSubscription.assignedMemberId) {
      const oldMemberName = currentSubscription.assignedMember?.name || currentSubscription.assignedMember?.email || 'Unassigned';
      const newMemberName = subscription.assignedMember?.name || subscription.assignedMember?.email || 'Unassigned';
      const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : new Date();

      await prisma.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: 'REASSIGNED',
          oldStatus: subscription.status,
          newStatus: subscription.status,
          oldMemberId: currentSubscription.assignedMemberId,
          newMemberId: data.assignedMemberId,
          assignmentDate: assignmentDate,
          notes: `Reassigned from ${oldMemberName} to ${newMemberName}`,
          performedById: currentUserId,
        },
      });
    } else if (data.assignmentDate !== undefined && currentSubscription.assignedMemberId) {
      // If only assignment date changed (member stayed same), update the most recent assignment history
      const latestAssignment = await prisma.subscriptionHistory.findFirst({
        where: {
          subscriptionId: subscription.id,
          action: { in: ['REASSIGNED', 'CREATED'] },
          newMemberId: currentSubscription.assignedMemberId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (latestAssignment && data.assignmentDate) {
        // Update the assignment date in the existing history record
        await prisma.subscriptionHistory.update({
          where: { id: latestAssignment.id },
          data: {
            assignmentDate: new Date(data.assignmentDate),
          },
        });
      }
    }

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.SUBSCRIPTION_UPDATED,
      'Subscription',
      subscription.id,
      { serviceName: subscription.serviceName, changes: data }
    );

    return NextResponse.json(subscription);
}

/**
 * DELETE /api/subscriptions/[id] - Delete subscription
 *
 * Permanently deletes a subscription from the system.
 *
 * IMPORTANT: This is a hard delete operation. All related data including:
 * - Subscription history entries (via cascade)
 * - Assignment records (via cascade)
 * will also be deleted.
 *
 * Consider using status updates (CANCELLED, EXPIRED) instead of hard delete
 * for subscriptions that need historical tracking.
 *
 * @param id - Subscription ID from URL path
 * @returns Success message
 * @throws 404 if subscription not found in tenant
 *
 * @example
 * DELETE /api/subscriptions/sub_xyz123
 * // Returns: { message: "Subscription deleted successfully" }
 */
async function deleteSubscriptionHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get subscription within tenant
    const subscription = await prisma.subscription.findFirst({
      where: { id, tenantId },
      select: { id: true, serviceName: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await prisma.subscription.delete({ where: { id } });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.SUBSCRIPTION_DELETED,
      'Subscription',
      subscription.id,
      { serviceName: subscription.serviceName }
    );

    return NextResponse.json({ message: 'Subscription deleted successfully' });
}

export const GET = withErrorHandler(getSubscriptionHandler, { requireAuth: true, requireModule: 'subscriptions' });
export const PUT = withErrorHandler(updateSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });
export const DELETE = withErrorHandler(deleteSubscriptionHandler, { requireAdmin: true, requireModule: 'subscriptions' });