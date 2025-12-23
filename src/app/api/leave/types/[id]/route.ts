import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updateLeaveTypeSchema } from '@/lib/validations/leave';
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

    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            leaveRequests: true,
            leaveBalances: true,
          },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    return NextResponse.json(leaveType);
  } catch (error) {
    console.error('Leave type GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leave type' },
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
    const validation = updateLeaveTypeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if leave type exists
    const existing = await prisma.leaveType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    // If name is being changed, check for duplicates
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.leaveType.findUnique({
        where: { name: data.name },
      });

      if (duplicate) {
        return NextResponse.json({
          error: 'A leave type with this name already exists',
        }, { status: 400 });
      }
    }

    // Handle JSON fields properly - convert null to undefined for Prisma
    const updateData = {
      ...data,
      serviceBasedEntitlement: data.serviceBasedEntitlement === null ? undefined : data.serviceBasedEntitlement,
      payTiers: data.payTiers === null ? undefined : data.payTiers,
    };

    const leaveType = await prisma.leaveType.update({
      where: { id },
      data: updateData,
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_TYPE_UPDATED,
      'LeaveType',
      leaveType.id,
      { name: leaveType.name, changes: data }
    );

    return NextResponse.json(leaveType);
  } catch (error) {
    console.error('Leave type PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update leave type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if leave type exists and has no associated requests
    const leaveType = await prisma.leaveType.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            leaveRequests: true,
          },
        },
      },
    });

    if (!leaveType) {
      return NextResponse.json({ error: 'Leave type not found' }, { status: 404 });
    }

    if (leaveType._count.leaveRequests > 0) {
      return NextResponse.json({
        error: 'Cannot delete leave type with existing requests. Consider deactivating it instead.',
      }, { status: 400 });
    }

    await prisma.leaveType.delete({
      where: { id },
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_TYPE_DELETED,
      'LeaveType',
      id,
      { name: leaveType.name }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave type DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete leave type' },
      { status: 500 }
    );
  }
}
