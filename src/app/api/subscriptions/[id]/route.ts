import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { updateSubscriptionSchema } from '@/lib/validations/subscriptions';
import { logAction, ActivityActions } from '@/lib/activity';
import { parseInputDateString } from '@/lib/date-format';
import { USD_TO_QAR_RATE } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Use findFirst with tenantId to prevent IDOR attacks
    const subscription = await prisma.subscription.findFirst({
      where: { id, tenantId },
      include: {
        assignedUser: {
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

    // Authorization check: Only admins or the assigned user can view the subscription
    if (session.user.role !== Role.ADMIN && subscription.assignedUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

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
        assignedUser: { select: { id: true, name: true, email: true } },
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
        assignedUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Track user assignment changes in history with custom date
    if (data.assignedUserId !== undefined && data.assignedUserId !== currentSubscription.assignedUserId) {
      const oldUserName = currentSubscription.assignedUser?.name || currentSubscription.assignedUser?.email || 'Unassigned';
      const newUserName = subscription.assignedUser?.name || subscription.assignedUser?.email || 'Unassigned';
      const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : new Date();

      await prisma.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          action: 'REASSIGNED',
          oldStatus: subscription.status,
          newStatus: subscription.status,
          oldUserId: currentSubscription.assignedUserId,
          newUserId: data.assignedUserId,
          assignmentDate: assignmentDate,
          notes: `Reassigned from ${oldUserName} to ${newUserName}`,
          performedBy: session.user.id,
        },
      });
    } else if (data.assignmentDate !== undefined && currentSubscription.assignedUserId) {
      // If only assignment date changed (user stayed same), update the most recent assignment history
      const latestAssignment = await prisma.subscriptionHistory.findFirst({
        where: {
          subscriptionId: subscription.id,
          action: { in: ['REASSIGNED', 'CREATED'] },
          newUserId: currentSubscription.assignedUserId,
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
      session.user.id,
      ActivityActions.SUBSCRIPTION_UPDATED,
      'Subscription',
      subscription.id,
      { serviceName: subscription.serviceName, changes: data }
    );

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Subscription PUT error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

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
      session.user.id,
      ActivityActions.SUBSCRIPTION_DELETED,
      'Subscription',
      subscription.id,
      { serviceName: subscription.serviceName }
    );

    return NextResponse.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Subscription DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}