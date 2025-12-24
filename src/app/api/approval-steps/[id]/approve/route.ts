import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { processApprovalSchema } from '@/lib/validations/system/approvals';
import { processApproval, getCurrentPendingStep } from '@/lib/domains/system/approvals';
import { logAction, ActivityActions } from '@/lib/activity';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/approval-steps/[id]/approve - Approve a step
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = processApprovalSchema.safeParse({ ...body, action: 'APPROVE' });

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const result = await processApproval(id, session.user.id, 'APPROVE', validation.data.notes);

    // Log the action
    await logAction(
      session.user.id,
      'APPROVAL_STEP_APPROVED',
      'ApprovalStep',
      id,
      {
        entityType: result.step.entityType,
        entityId: result.step.entityId,
        levelOrder: result.step.levelOrder,
        notes: validation.data.notes,
      }
    );

    // If chain is complete and all approved, update the original entity and notify requester
    if (result.isChainComplete && result.allApproved) {
      await handleFinalApproval(result.step.entityType, result.step.entityId, session.user.id);
    } else if (!result.isChainComplete && session.user.organizationId) {
      // Notify next approver (tenant-scoped)
      const nextStep = await getCurrentPendingStep(result.step.entityType, result.step.entityId);
      if (nextStep) {
        await notifyNextApprover(result.step.entityType, result.step.entityId, nextStep.requiredRole, session.user.organizationId);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Approve step error:', error);
    const message = error instanceof Error ? error.message : 'Failed to approve step';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleFinalApproval(entityType: string, entityId: string, approverId: string) {
  // Update the original entity status and notify requester
  if (entityType === 'LEAVE_REQUEST') {
    const leaveRequest = await prisma.leaveRequest.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approverId,
        approvedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        leaveType: { select: { name: true } },
      },
    });

    // Update balance: move from pending to used
    const year = leaveRequest.startDate.getFullYear();
    await prisma.leaveBalance.update({
      where: {
        userId_leaveTypeId_year: {
          userId: leaveRequest.userId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year,
        },
      },
      data: {
        pending: { decrement: Number(leaveRequest.totalDays) },
        used: { increment: Number(leaveRequest.totalDays) },
      },
    });

    // Notify requester
    await createNotification(
      NotificationTemplates.leaveApproved(
        leaveRequest.userId,
        leaveRequest.requestNumber,
        leaveRequest.leaveType?.name || 'Leave',
        entityId
      )
    );
  } else if (entityType === 'PURCHASE_REQUEST') {
    const purchaseRequest = await prisma.purchaseRequest.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        reviewedById: approverId,
        reviewedAt: new Date(),
      },
      include: {
        requester: { select: { id: true } },
      },
    });

    await createNotification(
      NotificationTemplates.purchaseRequestApproved(
        purchaseRequest.requesterId,
        purchaseRequest.referenceNumber,
        entityId
      )
    );
  } else if (entityType === 'ASSET_REQUEST') {
    const assetRequest = await prisma.assetRequest.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        processedById: approverId,
        processedAt: new Date(),
      },
      include: {
        user: { select: { id: true } },
        asset: { select: { assetTag: true } },
      },
    });

    await createNotification(
      NotificationTemplates.assetRequestApproved(
        assetRequest.userId,
        assetRequest.asset?.assetTag || '',
        assetRequest.requestNumber,
        entityId
      )
    );
  }
}

async function notifyNextApprover(entityType: string, entityId: string, requiredRole: string, tenantId: string) {
  // Find users with the required role to notify (tenant-scoped)
  const approvers = await prisma.user.findMany({
    where: {
      role: requiredRole as never,
      organizationMemberships: { some: { organizationId: tenantId } },
    },
    select: { id: true },
  });

  // Get entity details for notification
  let entityDetails: { title: string; requesterName: string; link: string } = {
    title: 'Request',
    requesterName: 'User',
    link: '/admin/my-approvals',
  };

  if (entityType === 'LEAVE_REQUEST') {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: entityId },
      include: {
        user: { select: { name: true, email: true } },
        leaveType: { select: { name: true } },
      },
    });
    if (request) {
      entityDetails = {
        title: `${request.leaveType?.name} Request (${request.requestNumber})`,
        requesterName: request.user?.name || request.user?.email || 'User',
        link: `/admin/leave/requests/${entityId}`,
      };
    }
  } else if (entityType === 'PURCHASE_REQUEST') {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: entityId },
      include: {
        requester: { select: { name: true, email: true } },
      },
    });
    if (request) {
      entityDetails = {
        title: `Purchase Request (${request.referenceNumber})`,
        requesterName: request.requester?.name || request.requester?.email || 'User',
        link: `/admin/purchase-requests/${entityId}`,
      };
    }
  } else if (entityType === 'ASSET_REQUEST') {
    const request = await prisma.assetRequest.findUnique({
      where: { id: entityId },
      include: {
        user: { select: { name: true, email: true } },
      },
    });
    if (request) {
      entityDetails = {
        title: `Asset Request (${request.requestNumber})`,
        requesterName: request.user?.name || request.user?.email || 'User',
        link: `/admin/asset-requests/${entityId}`,
      };
    }
  }

  // Notify all users with required role
  for (const approver of approvers) {
    await createNotification({
      recipientId: approver.id,
      type: 'APPROVAL_PENDING',
      title: 'Approval Required',
      message: `${entityDetails.requesterName}'s ${entityDetails.title} requires your approval.`,
      link: entityDetails.link,
      entityType,
      entityId,
    });
  }
}
