import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updateLeaveBalanceSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const balance = await prisma.leaveBalance.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            color: true,
            isPaid: true,
          },
        },
      },
    });

    if (!balance) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    // Non-admin users can only see their own balance
    if (session.user.role !== Role.ADMIN && balance.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Leave balance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave balance' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validation = updateLeaveBalanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { adjustment, adjustmentNotes } = validation.data;

    // Check if balance exists
    const existing = await prisma.leaveBalance.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true },
        },
        leaveType: {
          select: { name: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    // Calculate new adjustment (add to existing adjustment)
    const newAdjustment = Number(existing.adjustment) + adjustment;

    // Validate that resulting balance won't be negative
    const resultingBalance = Number(existing.entitlement) +
      Number(existing.carriedForward) +
      newAdjustment -
      Number(existing.used) -
      Number(existing.pending);

    if (resultingBalance < 0) {
      return NextResponse.json({
        error: `Adjustment would result in negative balance (${resultingBalance.toFixed(1)} days). Current available: ${(Number(existing.entitlement) + Number(existing.carriedForward) + Number(existing.adjustment) - Number(existing.used) - Number(existing.pending)).toFixed(1)} days`,
      }, { status: 400 });
    }

    const balance = await prisma.leaveBalance.update({
      where: { id },
      data: {
        adjustment: newAdjustment,
        adjustmentNotes: adjustmentNotes
          ? `${existing.adjustmentNotes ? existing.adjustmentNotes + '\n' : ''}${new Date().toISOString().split('T')[0]}: ${adjustment > 0 ? '+' : ''}${adjustment} days - ${adjustmentNotes}`
          : existing.adjustmentNotes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        leaveType: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_BALANCE_ADJUSTED,
      'LeaveBalance',
      balance.id,
      {
        userId: balance.userId,
        userName: existing.user?.name,
        leaveTypeName: existing.leaveType?.name,
        adjustment,
        notes: adjustmentNotes,
      }
    );

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Leave balance PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update leave balance' },
      { status: 500 }
    );
  }
}
