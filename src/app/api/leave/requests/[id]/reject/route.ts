/**
 * @file route.ts
 * @description Reject a pending leave request
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { rejectLeaveRequestSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

async function rejectLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

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
          approverId: currentUserId,
          rejectedAt: now,
          rejectionReason: reason,
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

      // Create history entry
      await tx.leaveRequestHistory.create({
        data: {
          leaveRequestId: id,
          action: 'REJECTED',
          oldStatus: 'PENDING',
          newStatus: 'REJECTED',
          notes: reason,
          performedById: currentUserId,
        },
      });

      return request;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_REQUEST_REJECTED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        memberName: existing.member?.name,
        leaveType: existing.leaveType?.name,
        reason,
      }
    );

    // NOTIF-004: Invalidate any pending WhatsApp action tokens for this request
    await invalidateTokensForEntity('LEAVE_REQUEST', id);

    // Send notification to the requester
    await createNotification(
      NotificationTemplates.leaveRejected(
        existing.memberId,
        leaveRequest.requestNumber,
        existing.leaveType?.name || 'Leave',
        reason,
        leaveRequest.id
      ),
      tenantId
    );

    return NextResponse.json(leaveRequest);
}

// Allow ADMIN, MANAGER, and HR_MANAGER to reject leave requests
export const POST = withErrorHandler(rejectLeaveRequestHandler, {
  requireApproverRole: [Role.ADMIN, Role.MANAGER, Role.HR_MANAGER],
  requireModule: 'leave'
});
