/**
 * @file route.ts
 * @description Approve a pending leave request
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { approveLeaveRequestSchema } from '@/lib/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

async function approveLeaveRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = approveLeaveRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { notes } = validation.data;

    // Get existing request within tenant to prevent IDOR attacks
    const existing = await prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: {
        member: {
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
          approverId: currentUserId,
          approvedAt: now,
          approverNotes: notes,
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

      // Update balance: pending -= totalDays, used += totalDays
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
          performedById: currentUserId,
        },
      });

      // Mark hajjLeaveTaken on TeamMember if this is once-in-employment leave (e.g., Hajj)
      if (existing.leaveType?.isOnceInEmployment) {
        await tx.teamMember.update({
          where: { id: existing.memberId },
          data: { hajjLeaveTaken: true },
        });
      }

      return request;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LEAVE_REQUEST_APPROVED,
      'LeaveRequest',
      leaveRequest.id,
      {
        requestNumber: leaveRequest.requestNumber,
        memberName: existing.member?.name,
        leaveType: existing.leaveType?.name,
        totalDays: Number(existing.totalDays),
      }
    );

    // NOTIF-004: Invalidate any pending WhatsApp action tokens for this request
    await invalidateTokensForEntity('LEAVE_REQUEST', id);

    // Send notification to the requester
    await createNotification(
      NotificationTemplates.leaveApproved(
        existing.memberId,
        leaveRequest.requestNumber,
        existing.leaveType?.name || 'Leave',
        leaveRequest.id
      ),
      tenantId
    );

    return NextResponse.json(leaveRequest);
}

// Allow ADMIN, MANAGER, and HR_MANAGER to approve leave requests
export const POST = withErrorHandler(approveLeaveRequestHandler, {
  requireApproverRole: [Role.ADMIN, Role.MANAGER, Role.HR_MANAGER],
  requireModule: 'leave'
});
