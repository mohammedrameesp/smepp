import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { processApprovalSchema } from '@/lib/validations/system/approvals';
import { processApproval } from '@/lib/domains/system/approvals';
import { logAction } from '@/lib/activity';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/approval-steps/[id]/reject - Reject a step
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = processApprovalSchema.safeParse({ ...body, action: 'REJECT' });

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const result = await processApproval(id, session.user.id, 'REJECT', validation.data.notes);

    const tenantId = session.user.organizationId!;

    // Log the action
    await logAction(
      tenantId,
      session.user.id,
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
      result.step.entityType,
      result.step.entityId,
      session.user.id,
      validation.data.notes,
      tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Reject step error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reject step';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleRejection(
  entityType: string,
  entityId: string,
  approverId: string,
  reason: string | undefined,
  tenantId: string
) {
  if (entityType === 'LEAVE_REQUEST') {
    const leaveRequest = await prisma.leaveRequest.update({
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
    await prisma.leaveBalance.update({
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
  } else if (entityType === 'PURCHASE_REQUEST') {
    const purchaseRequest = await prisma.purchaseRequest.update({
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
      NotificationTemplates.purchaseRequestRejected(
        purchaseRequest.requesterId,
        purchaseRequest.referenceNumber,
        reason,
        entityId
      ),
      tenantId
    );
  } else if (entityType === 'ASSET_REQUEST') {
    const assetRequest = await prisma.assetRequest.update({
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
