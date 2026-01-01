/**
 * @file route.ts
 * @description Single subscription CRUD operations endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { updateSubscriptionSchema } from '@/lib/validations/subscriptions';
import { logAction, ActivityActions } from '@/lib/activity';
import { parseInputDateString } from '@/lib/date-format';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

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

    // Authorization check: Only admins or the assigned member can view the subscription
    if (tenant!.userRole !== 'ADMIN' && subscription.assignedMemberId !== tenant!.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(subscription);
}

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
        if (currency === 'USD') {
          costQAR = costPerCycle * USD_TO_QAR_RATE;
        } else {
          costQAR = costPerCycle;
        }
      }
    }

    // If only currency is changing, recalculate costQAR
    if (data.costCurrency !== undefined && data.costPerCycle === undefined) {
      const currentCost = currentSubscription.costPerCycle ? Number(currentSubscription.costPerCycle) : 0;
      if (currentCost > 0) {
        if (data.costCurrency === 'USD') {
          costQAR = currentCost * USD_TO_QAR_RATE;
        } else {
          costQAR = currentCost;
        }
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