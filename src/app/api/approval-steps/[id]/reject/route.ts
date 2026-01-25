import { NextRequest, NextResponse } from 'next/server';
import { processApprovalSchema } from '@/features/approvals/validations/approvals';
import { processApproval } from '@/features/approvals/lib';
import { prisma } from '@/lib/core/prisma';
import { logAction } from '@/lib/core/activity';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// POST /api/approval-steps/[id]/reject - Reject a step
async function rejectStepHandler(request: NextRequest, context: APIContext) {
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
  const validation = processApprovalSchema.safeParse({ ...body, action: 'REJECT' });

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  // Get requester ID for self-rejection prevention
  // We need to look up the entity to get the requester
  const step = await prisma.approvalStep.findUnique({
    where: { id },
    select: { entityType: true, entityId: true },
  });

  let requesterId: string | undefined;
  if (step) {
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
      requesterId = request?.memberId;
    }
  }

  const result = await processApproval(id, userId, 'REJECT', validation.data.notes, {
    tenantId,
    requesterId,
  });

  // Log the action
  await logAction(
    tenantId,
    userId,
    'APPROVAL_STEP_REJECTED',
    'ApprovalStep',
    id,
    {
      entityType: result.step.entityType,
      entityId: result.step.entityId,
      levelOrder: result.step.levelOrder,
      notes: validation.data.notes,
    }
  );

  // Handle rejection - update original entity and notify requester
  await handleRejection(
    db,
    result.step.entityType,
    result.step.entityId,
    userId,
    validation.data.notes,
    tenantId
  );

  return NextResponse.json(result);
}

export const POST = withErrorHandler(rejectStepHandler, { requireCanApprove: true });

async function handleRejection(
  db: TenantPrismaClient,
  entityType: string,
  entityId: string,
  approverId: string,
  reason: string | undefined,
  tenantId: string
) {
  if (entityType === 'LEAVE_REQUEST') {
    const leaveRequest = await db.leaveRequest.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        approverId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        member: { select: { id: true } },
        leaveType: { select: { name: true } },
      },
    });

    // Update balance: remove from pending
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
      },
    });

    // Notify requester
    await createNotification(
      NotificationTemplates.leaveRejected(
        leaveRequest.memberId,
        leaveRequest.requestNumber,
        leaveRequest.leaveType?.name || 'Leave',
        reason,
        entityId
      ),
      tenantId
    );
  } else if (entityType === 'SPEND_REQUEST') {
    const spendRequest = await db.spendRequest.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        reviewedById: approverId,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
      include: {
        requester: { select: { id: true } },
      },
    });

    await createNotification(
      NotificationTemplates.spendRequestRejected(
        spendRequest.requesterId,
        spendRequest.referenceNumber,
        reason,
        entityId
      ),
      tenantId
    );
  } else if (entityType === 'ASSET_REQUEST') {
    const assetRequest = await db.assetRequest.update({
      where: { id: entityId },
      data: {
        status: 'REJECTED',
        processedById: approverId,
        processedAt: new Date(),
        processorNotes: reason,
      },
      include: {
        member: { select: { id: true } },
        asset: { select: { assetTag: true } },
      },
    });

    await createNotification(
      NotificationTemplates.assetRequestRejected(
        assetRequest.memberId,
        assetRequest.asset?.assetTag || '',
        assetRequest.requestNumber,
        reason,
        entityId
      ),
      tenantId
    );
  }
}
