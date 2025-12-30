import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, AssetStatus, AssetHistoryAction, Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { acceptAssetAssignmentSchema } from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import { canUserRespond } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendBatchEmails } from '@/lib/email';
import { assetAssignmentAcceptedEmail } from '@/lib/email-templates';
import { createBulkNotifications, NotificationTemplates } from '@/lib/domains/system/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const { id } = await context.params;
    const body = await request.json();

    const validation = acceptAssetAssignmentSchema.safeParse(body);
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
        assignedByUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // Only the target user can accept
    if (assetRequest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!canUserRespond(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot accept this assignment' }, { status: 400 });
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.ACCEPTED,
          processedById: session.user.id,
          processedAt: new Date(),
          processorNotes: notes,
        },
        include: {
          asset: {
            select: { id: true, assetTag: true, model: true, brand: true, type: true },
          },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Assign the asset to the user
      const assignmentDate = new Date().toISOString().split('T')[0];
      await tx.asset.update({
        where: { id: assetRequest.assetId },
        data: {
          assignedUserId: session.user.id,
          assignmentDate,
          status: AssetStatus.IN_USE,
        },
      });

      // Create asset history entry
      await tx.assetHistory.create({
        data: {
          assetId: assetRequest.assetId,
          action: AssetHistoryAction.ASSIGNED,
          fromUserId: null,
          toUserId: session.user.id,
          fromStatus: AssetStatus.SPARE,
          toStatus: AssetStatus.IN_USE,
          notes: `Assigned via request ${assetRequest.requestNumber}`,
          performedBy: session.user.id,
          assignmentDate: new Date(),
        },
      });

      // Create request history entry
      await tx.assetRequestHistory.create({
        data: {
          assetRequestId: id,
          action: 'ACCEPTED',
          oldStatus: assetRequest.status,
          newStatus: AssetRequestStatus.ACCEPTED,
          notes,
          performedById: session.user.id,
        },
      });

      return updated;
    });

    await logAction(
      session.user.id,
      ActivityActions.ASSET_ASSIGNMENT_ACCEPTED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        assetModel: assetRequest.asset.model,
      }
    );

    // Send email and in-app notifications to admins (tenant-scoped)
    try {
      // Get org slug for email URLs
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true },
      });
      const orgSlug = org?.slug || 'app';

      const admins = await prisma.user.findMany({
        where: {
          role: Role.ADMIN,
          organizationMemberships: { some: { organizationId: tenantId } },
        },
        select: { id: true, email: true },
      });
      const emailData = assetAssignmentAcceptedEmail({
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        assetModel: assetRequest.asset.model,
        assetBrand: assetRequest.asset.brand,
        assetType: assetRequest.asset.type,
        userName: assetRequest.user.name || assetRequest.user.email,
        userEmail: assetRequest.user.email,
        orgSlug,
      });
      await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

      // In-app notifications
      const notifications = admins.map(admin =>
        NotificationTemplates.assetAssignmentAccepted(
          admin.id,
          assetRequest.user.name || assetRequest.user.email,
          assetRequest.asset.assetTag || '',
          assetRequest.asset.model,
          assetRequest.requestNumber,
          id
        )
      );
      await createBulkNotifications(notifications, tenantId);
    } catch (emailError) {
      console.error('Failed to send notification:', emailError);
    }

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Asset request accept error:', error);
    return NextResponse.json(
      { error: 'Failed to accept asset assignment' },
      { status: 500 }
    );
  }
}
