import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cancelLeaveRequestSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { canCancelLeaveRequest } from '@/lib/leave-utils';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const validation = cancelLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    // Get existing request
    const existing = await prisma.leaveRequest.findUnique({
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
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Only owner or admin can cancel
    const isOwner = existing.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if can be cancelled
    if (!canCancelLeaveRequest(existing.status, existing.startDate)) {
      return NextResponse.json({
        error: 'Only pending or approved requests with future start dates can be cancelled',
      }, { status: 400 });
    }

    const now = new Date();
    const year = existing.startDate.getFullYear();
    const wasApproved = existing.status === 'APPROVED';

    // Cancel in transaction
    const leaveRequest = await prisma.$transaction(async (tx) => {
      // Update the request
      const request = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason,
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

      // Update balance based on previous status
      if (wasApproved) {
        // If was approved, decrement used
        await tx.leaveBalance.update({
          where: {
            userId_leaveTypeId_year: {
              userId: existing.userId,
              leaveTypeId: existing.leaveTypeId,
              year,
            },
          },
          data: {
            used: {
              decrement: Number(existing.totalDays),
            },
          },
        });
      } else {
        // If was pending, decrement pending
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
      }

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'CANCELLED',
          oldStatus: existing.status,
          newStatus: 'CANCELLED',
          notes: reason,
          performedById: session.user.id,
        },
      });

      return request;
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_REQUEST_CANCELLED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        userName: existing.user?.name,
        leaveType: existing.leaveType?.name,
        reason,
        cancelledBy: isOwner ? 'owner' : 'admin',
      }
    );

    // If admin cancelled someone else's leave, notify the employee
    if (isAdmin && !isOwner) {
      await createNotification(
        NotificationTemplates.leaveCancelled(
          existing.userId,
          leaveRequest.requestNumber,
          existing.leaveType?.name || 'Leave',
          true, // cancelled by admin
          reason,
          leaveRequest.id
        )
      );
    }

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave request cancel error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel leave request' },
      { status: 500 }
    );
  }
}
