import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, AssetRequestStatus, AssetRequestType, AssetStatus, AssetHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { approveAssetRequestSchema } from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { canAdminProcess } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendEmail } from '@/lib/email';
import { assetAssignmentPendingEmail, assetReturnApprovedEmail } from '@/lib/email-templates';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can approve
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await context.params;
    const body = await request.json();

    const validation = approveAssetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { notes } = validation.data;

    // Use findFirst with tenantId to prevent IDOR attacks
    const assetRequest = await prisma.assetRequest.findFirst({
      where: { id, tenantId },
      include: {
        asset: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    if (!canAdminProcess(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot approve this request' }, { status: 400 });
    }

    let newStatus: AssetRequestStatus;
    let activityAction: string;

    if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
      // When approving employee request, create an assignment that requires user acceptance
      newStatus = AssetRequestStatus.PENDING_USER_ACCEPTANCE;
      activityAction = ActivityActions.ASSET_REQUEST_APPROVED;
    } else if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
      // When approving return, unassign the asset
      newStatus = AssetRequestStatus.APPROVED;
      activityAction = ActivityActions.ASSET_RETURN_APPROVED;
    } else {
      return NextResponse.json({ error: 'Invalid request type for approval' }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: newStatus,
          processedById: session.user.id,
          processedAt: new Date(),
          processorNotes: notes,
          // For employee requests that get approved, set the admin as assigner
          assignedById: assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST
            ? session.user.id
            : assetRequest.assignedById,
        },
        include: {
          asset: {
            select: { id: true, assetTag: true, model: true, brand: true, type: true },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Create history entry
      await tx.assetRequestHistory.create({
        data: {
          assetRequestId: id,
          action: 'APPROVED',
          oldStatus: assetRequest.status,
          newStatus,
          notes,
          performedById: session.user.id,
        },
      });

      // If return request approved, unassign the asset
      if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
        await tx.asset.update({
          where: { id: assetRequest.assetId },
          data: {
            assignedUserId: null,
            assignmentDate: null,
            status: AssetStatus.SPARE,
          },
        });

        // Create asset history entry
        await tx.assetHistory.create({
          data: {
            assetId: assetRequest.assetId,
            action: AssetHistoryAction.UNASSIGNED,
            fromUserId: assetRequest.userId,
            toUserId: null,
            fromStatus: AssetStatus.IN_USE,
            toStatus: AssetStatus.SPARE,
            notes: `Returned via request ${assetRequest.requestNumber}`,
            performedBy: session.user.id,
            returnDate: new Date(),
          },
        });
      }

      return updated;
    });

    await logAction(
      session.user.id,
      activityAction,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        previousStatus: assetRequest.status,
        newStatus,
      }
    );

    // Send email notifications
    try {
      if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
        // Notify user that their request was approved (pending their acceptance)
        const emailData = assetAssignmentPendingEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset.assetTag,
          assetModel: assetRequest.asset.model,
          assetBrand: assetRequest.asset.brand,
          assetType: assetRequest.asset.type,
          userName: assetRequest.user.name || assetRequest.user.email,
          assignerName: session.user.name || session.user.email || 'Admin',
          reason: notes || undefined,
        });
        await sendEmail({ to: assetRequest.user.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
      } else if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
        // Notify user that their return was approved
        const emailData = assetReturnApprovedEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset.assetTag,
          assetModel: assetRequest.asset.model,
          assetBrand: assetRequest.asset.brand,
          assetType: assetRequest.asset.type,
          userName: assetRequest.user.name || assetRequest.user.email,
          approverName: session.user.name || session.user.email || 'Admin',
        });
        await sendEmail({ to: assetRequest.user.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    // Send in-app notification
    await createNotification(
      NotificationTemplates.assetRequestApproved(
        assetRequest.userId,
        assetRequest.asset.assetTag || assetRequest.asset.model,
        assetRequest.requestNumber,
        id
      )
    );

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Asset request approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve asset request' },
      { status: 500 }
    );
  }
}
