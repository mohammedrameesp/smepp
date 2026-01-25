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
import { parseInputDateString } from '@/lib/core/datetime';
import { convertToQAR } from '@/lib/core/currency';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * Maximum number of history entries to return in GET response.
 * Limits payload size while providing recent context.
 */
const SUBSCRIPTION_HISTORY_LIMIT = 10;

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
    const { tenant, params, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use tenant-scoped prisma (auto-filters by tenantId) to prevent IDOR attacks
    const subscription = await db.subscription.findFirst({
      where: { id },
      include: {
        assignedMember: {
          select: { id: true, name: true, email: true },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: SUBSCRIPTION_HISTORY_LIMIT,
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check access permissions
    const hasFullAccess = tenant?.isOwner || tenant?.isAdmin || tenant?.hasOperationsAccess;
    const isAssignedToUser = subscription.assignedMemberId === tenant.userId;

    if (!hasFullAccess && !isAssignedToUser) {
      // Check if manager viewing direct report's assigned subscription
      if (tenant?.canApprove && subscription.assignedMemberId) {
        const directReports = await db.teamMember.findMany({
          where: { reportingToId: tenant.userId },
          select: { id: true },
        });
        const directReportIds = directReports.map(r => r.id);
        if (!directReportIds.includes(subscription.assignedMemberId)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
    const { tenant, params, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { tenantId, userId: currentUserId } = tenant;
    const db = tenantPrisma as TenantPrismaClient;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Parse request body with error handling for malformed JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = updateSubscriptionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Get current subscription using tenant-scoped prisma
    const currentSubscription = await db.subscription.findFirst({
      where: { id },
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

    // Build update data object, transforming dates and excluding assignment-only fields
    // Using Record type for flexibility since we transform string dates to Date objects
    const { assignmentDate: _assignmentDate, purchaseDate, renewalDate, ...restData } = data;
    const updateData: Record<string, unknown> = { ...restData };

    // Ensure costQAR is set if calculated
    if (costQAR !== undefined) {
      updateData.costQAR = costQAR;
    }

    // Convert date strings to Date objects for Prisma
    if (purchaseDate !== undefined) {
      updateData.purchaseDate = purchaseDate ? parseInputDateString(purchaseDate) : null;
    }
    if (renewalDate !== undefined) {
      updateData.renewalDate = renewalDate ? parseInputDateString(renewalDate) : null;
    }

    // Update subscription using tenant-scoped prisma
    const subscription = await db.subscription.update({
      where: { id },
      data: updateData,
      include: {
        assignedMember: { select: { id: true, name: true, email: true } },
      },
    });

    // Track general field changes in history (excluding assignment which is handled separately)
    // DESIGN: SubscriptionHistory uses global prisma (not tenant-scoped) because:
    // - SubscriptionHistory table has no tenantId column
    // - Tenant isolation is enforced via subscriptionId FK - subscription was already
    //   verified above using tenant-scoped query, so history inherits that isolation
    const changeDescriptions: string[] = [];

    // Helper to format values for comparison and display
    const formatValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      if (val instanceof Date) return val.toISOString().split('T')[0];
      if (typeof val === 'object' && 'toNumber' in val) return String((val as { toNumber: () => number }).toNumber());
      return String(val);
    };

    // Track changes for each field
    if (data.serviceName !== undefined && formatValue(data.serviceName) !== formatValue(currentSubscription.serviceName)) {
      changeDescriptions.push(`serviceName: ${currentSubscription.serviceName} → ${data.serviceName}`);
    }
    if (data.vendor !== undefined && formatValue(data.vendor) !== formatValue(currentSubscription.vendor)) {
      changeDescriptions.push(`vendor: ${currentSubscription.vendor ?? 'empty'} → ${data.vendor ?? 'empty'}`);
    }
    if (data.category !== undefined && formatValue(data.category) !== formatValue(currentSubscription.category)) {
      changeDescriptions.push(`category: ${currentSubscription.category ?? 'empty'} → ${data.category ?? 'empty'}`);
    }
    if (data.costPerCycle !== undefined && formatValue(data.costPerCycle) !== formatValue(currentSubscription.costPerCycle)) {
      changeDescriptions.push(`costPerCycle: ${formatValue(currentSubscription.costPerCycle) || 'empty'} → ${formatValue(data.costPerCycle) || 'empty'}`);
    }
    if (data.costCurrency !== undefined && formatValue(data.costCurrency) !== formatValue(currentSubscription.costCurrency)) {
      changeDescriptions.push(`costCurrency: ${currentSubscription.costCurrency ?? 'empty'} → ${data.costCurrency ?? 'empty'}`);
    }
    if (data.billingCycle !== undefined && formatValue(data.billingCycle) !== formatValue(currentSubscription.billingCycle)) {
      changeDescriptions.push(`billingCycle: ${currentSubscription.billingCycle} → ${data.billingCycle}`);
    }
    if (purchaseDate !== undefined) {
      const oldDate = currentSubscription.purchaseDate ? formatValue(currentSubscription.purchaseDate) : 'empty';
      const newDate = purchaseDate ? purchaseDate : 'empty';
      if (oldDate !== newDate) {
        changeDescriptions.push(`purchaseDate: ${oldDate} → ${newDate}`);
      }
    }
    if (renewalDate !== undefined) {
      const oldDate = currentSubscription.renewalDate ? formatValue(currentSubscription.renewalDate) : 'empty';
      const newDate = renewalDate ? renewalDate : 'empty';
      if (oldDate !== newDate) {
        changeDescriptions.push(`renewalDate: ${oldDate} → ${newDate}`);
      }
    }
    if (data.notes !== undefined && formatValue(data.notes) !== formatValue(currentSubscription.notes)) {
      changeDescriptions.push(`notes: updated`);
    }

    // Create UPDATED history entry if any tracked fields changed
    if (changeDescriptions.length > 0) {
      await prisma.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: 'UPDATED',
          oldStatus: currentSubscription.status,
          newStatus: subscription.status,
          notes: `Updated: ${changeDescriptions.join(', ')}`,
          performedById: currentUserId,
        },
      });
    }

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
    const { tenant, params, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { tenantId, userId: currentUserId } = tenant;
    const db = tenantPrisma as TenantPrismaClient;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get subscription using tenant-scoped prisma
    const subscription = await db.subscription.findFirst({
      where: { id },
      select: { id: true, serviceName: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Delete using tenant-scoped prisma (ensures tenant ownership)
    await db.subscription.delete({ where: { id } });

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