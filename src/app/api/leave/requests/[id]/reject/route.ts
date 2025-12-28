import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { rejectLeaveRequestSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const validation = rejectLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    // Get existing request within tenant
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, tenantId },
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
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json({
        error: 'Only pending requests can be rejected',
      }, { status: 400 });
    }

    const now = new Date();
    const year = existing.startDate.getFullYear();

    // Reject in transaction
    const leaveRequest = await prisma.$transaction(async (tx) => {
      // Update the request
      const request = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approverId: session.user.id,
          rejectedAt: now,
          rejectionReason: reason,
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
          approver: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Update balance: pending -= totalDays
      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId_year: {
            userId: existing.userId,
            leaveTypeId: existing.leaveTypeId,
            year,
          },
        },
        data: {
          pending: {
            decrement: Number(existing.totalDays),
          },
        },
      });

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'REJECTED',
          oldStatus: 'PENDING',
          newStatus: 'REJECTED',
          notes: reason,
          performedById: session.user.id,
        },
      });

      return request;
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_REQUEST_REJECTED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        userName: existing.user?.name,
        leaveType: existing.leaveType?.name,
        reason,
      }
    );

    // Send notification to the requester
    await createNotification(
      NotificationTemplates.leaveRejected(
        existing.userId,
        leaveRequest.requestNumber,
        existing.leaveType?.name || 'Leave',
        reason,
        leaveRequest.id
      )
    );

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave request reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject leave request' },
      { status: 500 }
    );
  }
}
