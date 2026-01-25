import { NextRequest, NextResponse } from 'next/server';
import { processApprovalSchema } from '@/features/approvals/validations/approvals';
import { processApproval, getCurrentPendingStep, getApproversForRole } from '@/features/approvals/lib';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/core/activity';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { notifyNextLevelApproversViaWhatsApp } from '@/lib/whatsapp/approval-integration';
import { Role } from '@prisma/client';

// POST /api/approval-steps/[id]/approve - Approve a step
async function approveStepHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Approval step ID required' }, { status: 400 });
  }

  const body = await request.json();
  const validation = processApprovalSchema.safeParse({ ...body, action: 'APPROVE' });

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  // Get requester ID for self-approval prevention
  // First verify the step exists and belongs to this tenant (IDOR prevention)
  // ApprovalStep has tenantId field, so we query with tenant filter
  const step = await prisma.approvalStep.findFirst({
    where: {
      id,
      tenantId, // Critical: Only find steps belonging to this tenant
    },
    select: { entityType: true, entityId: true },
  });

  // If no step found, either doesn't exist or belongs to another tenant
  if (!step) {
    return NextResponse.json({ error: 'Approval step not found' }, { status: 404 });
  }

  // Now get the requester ID from the entity (using tenant-scoped db)
  let requesterId: string | undefined;

  if (step.entityType === 'LEAVE_REQUEST') {
    const request = await db.leaveRequest.findUnique({
      where: { id: step.entityId },
      select: { memberId: true },
    });
    requesterId = request?.memberId;
  } else if (step.entityType === 'SPEND_REQUEST') {
    const request = await db.spendRequest.findUnique({
      where: { id: step.entityId },
      select: { requesterId: true },
    });
    requesterId = request?.requesterId;
  } else if (step.entityType === 'ASSET_REQUEST') {
    const request = await db.assetRequest.findUnique({
      where: { id: step.entityId },
      select: { memberId: true },
    });
    requesterId = request?.memberId ?? undefined;
  }

  const result = await processApproval(id, userId, 'APPROVE', validation.data.notes, {
    tenantId,
    requesterId,
  });

  // Log the action
  await logAction(
    tenantId,
    userId,
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
    await handleFinalApproval(db, result.step.entityType, result.step.entityId, userId, tenantId);
  } else if (!result.isChainComplete) {
    // Notify next approver (tenant-scoped)
    const nextStep = await getCurrentPendingStep(result.step.entityType, result.step.entityId);
    if (nextStep) {
      // Send in-app notifications to next level approvers
      await notifyNextApprover(db, result.step.entityType, result.step.entityId, nextStep.requiredRole, tenantId, requesterId);

      // Send WhatsApp notifications to next level approvers (non-blocking)
      notifyNextLevelApproversViaWhatsApp(
        tenantId,
        result.step.entityType,
        result.step.entityId,
        nextStep.requiredRole,
        requesterId
      );
    }
  }

  return NextResponse.json(result);
}

export const POST = withErrorHandler(approveStepHandler, { requireCanApprove: true });

async function handleFinalApproval(
  db: TenantPrismaClient,
  entityType: string,
  entityId: string,
  approverId: string,
  tenantId: string
) {
  // Update the original entity status and notify requester
  if (entityType === 'LEAVE_REQUEST') {
    const leaveRequest = await db.leaveRequest.update({
      where: { id: entityId },
      data: {
        status: 'APPROVED',
        approverId,
        approvedAt: new Date(),
      },
      include: {
        member: { select: { id: true, name: true } },
        leaveType: { select: { name: true } },
      },
    });

    // Update balance: move from pending to used
    const year = leaveRequest.startDate.getFullYear();
    await db.leaveBalance.update({
      where: {
        tenantId_memberId_leaveTypeId_year: {
          tenantId: leaveRequest.tenantId,
          memberId: leaveRequest.memberId,
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
        leaveRequest.memberId,
        leaveRequest.requestNumber,
        leaveRequest.leaveType?.name || 'Leave',
        entityId
      ),
      tenantId
    );
  } else if (entityType === 'SPEND_REQUEST') {
    const spendRequest = await db.spendRequest.update({
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
      NotificationTemplates.spendRequestApproved(
        spendRequest.requesterId,
        spendRequest.referenceNumber,
        entityId
      ),
      tenantId
    );
  } else if (entityType === 'ASSET_REQUEST') {
    // First get the request to check its type
    const existingRequest = await db.assetRequest.findUnique({
      where: { id: entityId },
      select: { type: true },
    });

    // For EMPLOYEE_REQUEST, status goes to PENDING_USER_ACCEPTANCE (employee must accept)
    // For RETURN_REQUEST, status goes directly to APPROVED
    const newStatus = existingRequest?.type === 'EMPLOYEE_REQUEST'
      ? 'PENDING_USER_ACCEPTANCE'
      : 'APPROVED';

    const assetRequest = await db.assetRequest.update({
      where: { id: entityId },
      data: {
        status: newStatus,
        processedById: approverId,
        processedAt: new Date(),
        // For employee requests, set the admin as assigner
        ...(existingRequest?.type === 'EMPLOYEE_REQUEST' && { assignedById: approverId }),
      },
      include: {
        member: { select: { id: true } },
        asset: { select: { assetTag: true } },
      },
    });

    await createNotification(
      NotificationTemplates.assetRequestApproved(
        assetRequest.memberId,
        assetRequest.asset?.assetTag || '',
        assetRequest.requestNumber,
        entityId
      ),
      tenantId
    );
  }
}

async function notifyNextApprover(
  db: TenantPrismaClient,
  entityType: string,
  entityId: string,
  requiredRole: string,
  tenantId: string,
  requesterId?: string
) {
  // Find team members with the required role to notify (role-based routing)
  const approvers = await getApproversForRole(requiredRole as Role, tenantId, requesterId);

  // Get entity details for notification
  let entityDetails: { title: string; requesterName: string; link: string } = {
    title: 'Request',
    requesterName: 'User',
    link: '/admin/my-approvals',
  };

  if (entityType === 'LEAVE_REQUEST') {
    const request = await db.leaveRequest.findUnique({
      where: { id: entityId },
      include: {
        member: { select: { name: true, email: true } },
        leaveType: { select: { name: true } },
      },
    });
    if (request) {
      entityDetails = {
        title: `${request.leaveType?.name} Request (${request.requestNumber})`,
        requesterName: request.member?.name || request.member?.email || 'User',
        link: `/admin/leave/requests/${entityId}`,
      };
    }
  } else if (entityType === 'SPEND_REQUEST') {
    const request = await db.spendRequest.findUnique({
      where: { id: entityId },
      include: {
        requester: { select: { name: true, email: true } },
      },
    });
    if (request) {
      entityDetails = {
        title: `Spend Request (${request.referenceNumber})`,
        requesterName: request.requester?.name || request.requester?.email || 'User',
        link: `/admin/spend-requests/${entityId}`,
      };
    }
  } else if (entityType === 'ASSET_REQUEST') {
    const request = await db.assetRequest.findUnique({
      where: { id: entityId },
      include: {
        member: { select: { name: true, email: true } },
      },
    });
    if (request) {
      entityDetails = {
        title: `Asset Request (${request.requestNumber})`,
        requesterName: request.member?.name || request.member?.email || 'User',
        link: `/admin/asset-requests/${entityId}`,
      };
    }
  }

  // Notify all users with required role
  if (approvers.length > 0) {
    const notifications = approvers.map(approver => ({
      recipientId: approver.id,
      type: 'APPROVAL_PENDING' as const,
      title: 'Approval Required',
      message: `${entityDetails.requesterName}'s ${entityDetails.title} requires your approval.`,
      link: entityDetails.link,
      entityType,
      entityId,
    }));
    await createBulkNotifications(notifications, tenantId);
  }
}
