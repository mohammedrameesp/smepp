/**
 * @file route.ts
 * @description Asset request approval API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, AssetRequestType, AssetStatus, AssetHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { approveAssetRequestSchema } from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { canAdminProcess } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendEmail } from '@/lib/email';
import { assetAssignmentPendingEmail, assetReturnApprovedEmail } from '@/lib/email-templates';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

async function approveAssetRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

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
        member: { select: { id: true, name: true, email: true } },
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
          member: { select: { id: true, name: true, email: true } },
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
            assignedMemberId: null,
            assignmentDate: null,
            status: AssetStatus.SPARE,
          },
        });

        // Create asset history entry
        await tx.assetHistory.create({
          data: {
            tenantId,
            assetId: assetRequest.assetId,
            action: AssetHistoryAction.UNASSIGNED,
            fromMemberId: assetRequest.memberId,
            toMemberId: null,
            fromStatus: AssetStatus.IN_USE,
            toStatus: AssetStatus.SPARE,
            notes: `Returned via request ${assetRequest.requestNumber}`,
            performedById: session.user.id,
            returnDate: new Date(),
          },
        });
      }

      return updated;
    });

    await logAction(
      tenantId,
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

    // NOTIF-004: Invalidate any pending WhatsApp action tokens for this request
    await invalidateTokensForEntity('ASSET_REQUEST', id);

    // Send email notifications
    try {
      // Get org slug/name for email URLs
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true },
      });
      const orgSlug = org?.slug || 'app';
      const orgName = org?.name || 'Durj';

      if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
        // Notify user that their request was approved (pending their acceptance)
        const emailData = assetAssignmentPendingEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset?.assetTag || '',
          assetModel: assetRequest.asset?.model || '',
          assetBrand: assetRequest.asset?.brand || '',
          assetType: assetRequest.asset?.type || '',
          userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
          assignerName: session.user.name || session.user.email || 'Admin',
          reason: notes || undefined,
          orgSlug,
          orgName,
        });
        await sendEmail({ to: assetRequest.member?.email || '', subject: emailData.subject, html: emailData.html, text: emailData.text });
      } else if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
        // Notify user that their return was approved
        const emailData = assetReturnApprovedEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset?.assetTag || '',
          assetModel: assetRequest.asset?.model || '',
          assetBrand: assetRequest.asset?.brand || '',
          assetType: assetRequest.asset?.type || '',
          userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
          approverName: session.user.name || session.user.email || 'Admin',
          orgSlug,
          orgName,
        });
        await sendEmail({ to: assetRequest.member?.email || '', subject: emailData.subject, html: emailData.html, text: emailData.text });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    // Send in-app notification
    await createNotification(
      NotificationTemplates.assetRequestApproved(
        assetRequest.memberId,
        assetRequest.asset?.assetTag || assetRequest.asset?.model || 'Asset',
        assetRequest.requestNumber,
        id
      ),
      tenantId
    );

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(approveAssetRequestHandler, { requireAdmin: true, requireModule: 'assets' });
