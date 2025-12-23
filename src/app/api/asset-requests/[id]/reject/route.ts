import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { rejectAssetRequestSchema } from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { canAdminProcess } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendEmail } from '@/lib/email';
import { assetRequestRejectedEmail, assetReturnRejectedEmail } from '@/lib/email-templates';
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

    // Only admins can reject
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const validation = rejectAssetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { reason } = validation.data;

    const assetRequest = await prisma.assetRequest.findUnique({
      where: { id },
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

    // Send email notification to user
    try {
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
      )
    );

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Asset request reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject asset request' },
      { status: 500 }
    );
  }
}
