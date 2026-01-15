/**
 * @file route.ts
 * @description Reject a pending leave request with multi-level approval chain support.
 *              When rejected at any level, all remaining steps are marked as SKIPPED.
 * @module hr/leave
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { rejectLeaveRequestSchema } from '@/features/leave/validations/leave';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';
import {
  getApprovalChain,
  getApprovalChainSummary,
} from '@/features/approvals/lib';
import { Role } from '@prisma/client';

/**
 * Determine what role level the current user can reject at.
 * Returns the highest role they qualify for.
 */
async function getUserApprovalRole(
  db: TenantPrismaClient,
  userId: string,
  requesterId: string
): Promise<{ role: Role; levelOrder: number } | null> {
  const member = await db.teamMember.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isAdmin: true,
      isOwner: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
    },
  });

  if (!member) return null;

  // Admin = Director (highest level)
  if (member.isAdmin) {
    return { role: 'DIRECTOR', levelOrder: 3 };
  }

  // Owner = Director only if no other admins exist
  if (member.isOwner) {
    const otherAdminCount = await db.teamMember.count({
      where: {
        isAdmin: true,
        isDeleted: false,
        id: { not: userId },
      },
    });
    if (otherAdminCount === 0) {
      return { role: 'DIRECTOR', levelOrder: 3 };
    }
  }

  // HR Manager is level 2
  if (member.hasHRAccess) {
    return { role: 'HR_MANAGER', levelOrder: 2 };
  }

  // Check if user is the requester's direct manager (level 1)
  const requester = await db.teamMember.findUnique({
    where: { id: requesterId },
    select: { reportingToId: true },
  });

  if (requester?.reportingToId === userId) {
    return { role: 'MANAGER', levelOrder: 1 };
  }

  return null;
}

async function rejectLeaveRequestHandler(request: NextRequest, context: APIContext) {
  const { tenant, params, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;
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

  // Get existing request within tenant (tenant filtering is automatic via db)
  const existing = await db.leaveRequest.findFirst({
    where: { id },
    include: {
      member: {
        select: { id: true, name: true },
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

  // Get the approval chain
  const chain = await getApprovalChain('LEAVE_REQUEST', id);

  if (chain.length === 0) {
    return NextResponse.json({ error: 'No approval chain found for this request' }, { status: 400 });
  }

  // Determine user's approval role
  const userRole = await getUserApprovalRole(db, currentUserId, existing.memberId);

  if (!userRole) {
    return NextResponse.json({ error: 'You do not have permission to reject this request' }, { status: 403 });
  }

  // Find the step that matches the user's role
  const userStep = chain.find(step => step.requiredRole === userRole.role);

  if (!userStep) {
    // User's role is not in the chain - check if they can reject any step
    // Admins can reject at any point
    const member = await db.teamMember.findUnique({
      where: { id: currentUserId },
      select: { isAdmin: true },
    });

    if (!member?.isAdmin) {
      return NextResponse.json({
        error: 'Your role is not part of the approval chain for this request'
      }, { status: 403 });
    }
  }

  // Get rejector name for notes
  const rejector = await db.teamMember.findUnique({
    where: { id: currentUserId },
    select: { name: true, email: true },
  });
  const rejectorName = rejector?.name || rejector?.email || 'Unknown';

  // Determine which step to reject based on user's role
  const stepToReject = userStep || chain[chain.length - 1]; // If no matching step, reject at highest level (admin case)

  const now = new Date();
  const year = existing.startDate.getFullYear();

  // Process rejection in transaction
  const leaveRequest = await prisma.$transaction(async (tx) => {
    // Mark the user's step as REJECTED
    await tx.approvalStep.update({
      where: { id: stepToReject.id },
      data: {
        status: 'REJECTED',
        approverId: currentUserId,
        actionAt: now,
        notes: reason || undefined,
      },
    });

    // Mark all other pending steps as SKIPPED
    await tx.approvalStep.updateMany({
      where: {
        entityType: 'LEAVE_REQUEST',
        entityId: id,
        status: 'PENDING',
      },
      data: {
        status: 'SKIPPED',
        approverId: currentUserId,
        actionAt: now,
        notes: `Skipped - Rejected by ${rejectorName}`,
      },
    });

    // Update the leave request
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
          select: { id: true, name: true, email: true },
        },
        leaveType: {
          select: { id: true, name: true, color: true },
        },
        approver: {
          select: { id: true, name: true },
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
        pending: { decrement: Number(existing.totalDays) },
      },
    });

    // Create history entry
    await tx.leaveRequestHistory.create({
      data: {
        leaveRequestId: id,
        action: 'REJECTED',
        oldStatus: 'PENDING',
        newStatus: 'REJECTED',
        notes: `Rejected by ${rejectorName} (Level ${stepToReject.levelOrder}): ${reason || 'No reason provided'}`,
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
      rejectionLevel: stepToReject.levelOrder,
    }
  );

  // Invalidate WhatsApp action tokens
  await invalidateTokensForEntity('LEAVE_REQUEST', id);

  // Notify the requester
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

  // Include approval chain in response
  const updatedChain = await getApprovalChain('LEAVE_REQUEST', id);
  const chainSummary = await getApprovalChainSummary('LEAVE_REQUEST', id);

  return NextResponse.json({
    ...leaveRequest,
    approvalChain: updatedChain,
    approvalSummary: chainSummary,
    message: 'Leave request rejected',
  });
}

// Allow users with approval capability to reject leave requests
export const POST = withErrorHandler(rejectLeaveRequestHandler, {
  requireCanApprove: true,
  requireModule: 'leave'
});
