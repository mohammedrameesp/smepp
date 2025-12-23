import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { approveLeaveRequestSchema } from '@/lib/validations/leave';
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

    const { id } = await params;

    const body = await request.json();
    const validation = approveLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { notes } = validation.data;

    // Get existing request
    const existing = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true },
        },
        leaveType: {
          select: { name: true, isOnceInEmployment: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json({
        error: 'Only pending requests can be approved',
      }, { status: 400 });
    }

    const now = new Date();
    const year = existing.startDate.getFullYear();

    // Approve in transaction
    const leaveRequest = await prisma.$transaction(async (tx) => {
      // Update the request
      const request = await tx.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approverId: session.user.id,
          approvedAt: now,
          approverNotes: notes,
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

      // Update balance: pending -= totalDays, used += totalDays
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
          used: {
            increment: Number(existing.totalDays),
          },
        },
      });

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'APPROVED',
          oldStatus: 'PENDING',
          newStatus: 'APPROVED',
          notes,
          performedById: session.user.id,
        },
      });

      // Mark hajjLeaveTaken on HR profile if this is once-in-employment leave (e.g., Hajj)
      if (existing.leaveType?.isOnceInEmployment) {
        await tx.hRProfile.update({
          where: { userId: existing.userId },
          data: { hajjLeaveTaken: true },
        });
      }

      return request;
    });

    await logAction(
      session.user.id,
      ActivityActions.LEAVE_REQUEST_APPROVED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        userName: existing.user?.name,
        leaveType: existing.leaveType?.name,
        totalDays: Number(existing.totalDays),
      }
    );

    // Send notification to the requester
    await createNotification(
      NotificationTemplates.leaveApproved(
        existing.userId,
        leaveRequest.requestNumber,
        existing.leaveType?.name || 'Leave',
        leaveRequest.id
      )
    );

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error('Leave request approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve leave request' },
      { status: 500 }
    );
  }
}
