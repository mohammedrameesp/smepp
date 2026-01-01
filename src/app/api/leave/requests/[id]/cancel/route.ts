/**
 * @file route.ts
 * @description Cancel a leave request (by owner or admin)
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { cancelLeaveRequestSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/activity';
import { canCancelLeaveRequest } from '@/lib/leave-utils';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function cancelLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = cancelLeaveRequestSchema.safeParse(body);

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
        member: {
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
    const isOwner = existing.memberId === currentUserId;
    const isAdmin = tenant!.userRole === 'ADMIN';

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
          member: {
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
            tenantId_memberId_leaveTypeId_year: {
              tenantId,
              memberId: existing.memberId,
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
            tenantId_memberId_leaveTypeId_year: {
              tenantId,
              memberId: existing.memberId,
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
          performedById: currentUserId,
        },
      });

      return request;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_REQUEST_CANCELLED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        userName: existing.member?.name,
        leaveType: existing.leaveType?.name,
        reason,
        cancelledBy: isOwner ? 'owner' : 'admin',
      }
    );

    // If admin cancelled someone else's leave, notify the employee
    if (isAdmin && !isOwner) {
      await createNotification(
        NotificationTemplates.leaveCancelled(
          existing.memberId,
          leaveRequest.requestNumber,
          existing.leaveType?.name || 'Leave',
          true, // cancelled by admin
          reason,
          leaveRequest.id
        ),
        tenantId
      );
    }

    return NextResponse.json(leaveRequest);
}

export const POST = withErrorHandler(cancelLeaveRequestHandler, { requireAuth: true, requireModule: 'leave' });
