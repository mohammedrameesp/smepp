/**
 * @file route.ts
 * @description Asset assignment decline API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { declineAssetAssignmentSchema } from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { canUserRespond } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendBatchEmails } from '@/lib/email';
import { assetAssignmentDeclinedEmail } from '@/lib/email-templates';
import { createBulkNotifications, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function declineAssetAssignmentHandler(request: NextRequest, context: APIContext) {
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

    const validation = declineAssetAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    // Use findFirst with tenantId to prevent IDOR attacks
    const assetRequest = await prisma.assetRequest.findFirst({
      where: { id, tenantId },
      include: {
        asset: { select: { assetTag: true, model: true, brand: true, type: true } },
        user: { select: { id: true, name: true, email: true } },
        assignedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // Only the target user can decline
    if (assetRequest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!canUserRespond(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot decline this assignment' }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.REJECTED_BY_USER,
          processedById: session.user.id,
          processedAt: new Date(),
          processorNotes: reason,
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
          action: 'DECLINED',
          oldStatus: assetRequest.status,
          newStatus: AssetRequestStatus.REJECTED_BY_USER,
          notes: reason,
          performedById: session.user.id,
        },
      });

      return updated;
    });

    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_ASSIGNMENT_DECLINED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        declineReason: reason,
      }
    );

    // Send email and in-app notifications to admins (tenant-scoped)
    try {
      // Get org slug/name for email URLs
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true },
      });
      const orgSlug = org?.slug || 'app';
      const orgName = org?.name || 'Durj';

      const admins = await prisma.user.findMany({
        where: {
          role: Role.ADMIN,
          organizationMemberships: { some: { organizationId: tenantId } },
        },
        select: { id: true, email: true },
      });
      const emailData = assetAssignmentDeclinedEmail({
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        assetModel: assetRequest.asset.model,
        assetBrand: assetRequest.asset.brand,
        assetType: assetRequest.asset.type,
        userName: assetRequest.user.name || assetRequest.user.email,
        userEmail: assetRequest.user.email,
        reason: reason || 'No reason provided',
        orgSlug,
        orgName,
      });
      await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

      // In-app notifications
      const notifications = admins.map(admin =>
        NotificationTemplates.assetAssignmentDeclined(
          admin.id,
          assetRequest.user.name || assetRequest.user.email,
          assetRequest.asset.assetTag || '',
          assetRequest.asset.model,
          assetRequest.requestNumber,
          reason,
          id
        )
      );
      await createBulkNotifications(notifications, tenantId);
    } catch (emailError) {
      console.error('Failed to send notification:', emailError);
    }

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(declineAssetAssignmentHandler, { requireAuth: true, requireModule: 'assets' });
