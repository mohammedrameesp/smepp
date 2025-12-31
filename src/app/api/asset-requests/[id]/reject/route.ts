/**
 * @file route.ts
 * @description Asset request rejection API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { rejectAssetRequestSchema } from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { canAdminProcess } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendEmail } from '@/lib/email';
import { assetRequestRejectedEmail, assetReturnRejectedEmail } from '@/lib/email-templates';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

async function rejectAssetRequestHandler(request: NextRequest, context: APIContext) {
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

    const validation = rejectAssetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    // Use findFirst with tenantId to prevent cross-tenant access
    const assetRequest = await prisma.assetRequest.findFirst({
      where: { id, tenantId },
      include: {
        asset: { select: { assetTag: true, model: true, brand: true, type: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    if (!canAdminProcess(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot reject this request' }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.REJECTED,
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
          action: 'REJECTED',
          oldStatus: assetRequest.status,
          newStatus: AssetRequestStatus.REJECTED,
          notes: reason,
          performedById: session.user.id,
        },
      });

      return updated;
    });

    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_REQUEST_REJECTED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        rejectionReason: reason,
      }
    );

    // NOTIF-004: Invalidate any pending WhatsApp action tokens for this request
    await invalidateTokensForEntity('ASSET_REQUEST', id);

    // Send email notification to user
    try {
      // Get org slug/name for email URLs
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true },
      });
      const orgSlug = org?.slug || 'app';
      const orgName = org?.name || 'Durj';

      if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
        const emailData = assetRequestRejectedEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset.assetTag,
          assetModel: assetRequest.asset.model,
          assetBrand: assetRequest.asset.brand,
          assetType: assetRequest.asset.type,
          userName: assetRequest.user.name || assetRequest.user.email,
          rejectorName: session.user.name || session.user.email || 'Admin',
          reason: reason || 'No reason provided',
          orgSlug,
          orgName,
        });
        await sendEmail({ to: assetRequest.user.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
      } else if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
        const emailData = assetReturnRejectedEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset.assetTag,
          assetModel: assetRequest.asset.model,
          assetBrand: assetRequest.asset.brand,
          assetType: assetRequest.asset.type,
          userName: assetRequest.user.name || assetRequest.user.email,
          rejectorName: session.user.name || session.user.email || 'Admin',
          reason: reason || 'No reason provided',
          orgSlug,
          orgName,
        });
        await sendEmail({ to: assetRequest.user.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
    }

    // Send in-app notification
    await createNotification(
      NotificationTemplates.assetRequestRejected(
        assetRequest.userId,
        assetRequest.asset.assetTag || assetRequest.asset.model,
        assetRequest.requestNumber,
        reason,
        id
      ),
      tenantId
    );

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(rejectAssetRequestHandler, { requireAdmin: true, requireModule: 'assets' });
