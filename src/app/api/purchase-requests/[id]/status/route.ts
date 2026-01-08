/**
 * @file route.ts
 * @description Update purchase request status (approve, reject, complete)
 * @module projects/purchase-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { updatePurchaseRequestStatusSchema } from '@/lib/validations/purchase-request';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { getAllowedStatusTransitions, getStatusLabel } from '@/lib/purchase-request-utils';
import { sendEmail } from '@/lib/core/email';
import { purchaseRequestStatusEmail } from '@/lib/core/email-templates';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

// PATCH - Update purchase request status (admin only)
async function updateStatusHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get current request within tenant
    const currentRequest = await prisma.purchaseRequest.findFirst({
      where: { id, tenantId },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!currentRequest) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updatePurchaseRequestStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { status, reviewNotes, completionNotes } = validation.data;

    // Validate status transition
    const allowedTransitions = getAllowedStatusTransitions(currentRequest.status);
    if (!allowedTransitions.includes(status)) {
      return NextResponse.json({
        error: `Cannot transition from ${currentRequest.status} to ${status}`,
        allowedTransitions,
      }, { status: 400 });
    }

    // Build update data
    const updateData: any = {
      status,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    };

    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      if (completionNotes !== undefined) {
        updateData.completionNotes = completionNotes;
      }
    }

    // Update the request
    const purchaseRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseRequest.update({
        where: { id },
        data: updateData,
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            orderBy: { itemNumber: 'asc' },
          },
        },
      });

      // Create history entry
      await tx.purchaseRequestHistory.create({
        data: {
          purchaseRequestId: id,
          action: 'STATUS_CHANGED',
          previousStatus: currentRequest.status,
          newStatus: status,
          performedById: session.user.id,
          details: reviewNotes || `Status changed to ${getStatusLabel(status)}`,
        },
      });

      return updated;
    });

    // Determine activity action based on new status
    let activityAction: string = ActivityActions.PURCHASE_REQUEST_STATUS_CHANGED;
    if (status === 'APPROVED') {
      activityAction = ActivityActions.PURCHASE_REQUEST_APPROVED;
    } else if (status === 'REJECTED') {
      activityAction = ActivityActions.PURCHASE_REQUEST_REJECTED;
    } else if (status === 'COMPLETED') {
      activityAction = ActivityActions.PURCHASE_REQUEST_COMPLETED;
    }

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      activityAction,
      'PurchaseRequest',
      purchaseRequest.id,
      {
        referenceNumber: purchaseRequest.referenceNumber,
        previousStatus: currentRequest.status,
        newStatus: status,
        reviewNotes,
      }
    );

    // NOTIF-004: Invalidate any pending WhatsApp action tokens for this request
    if (status === 'APPROVED' || status === 'REJECTED') {
      await invalidateTokensForEntity('PURCHASE_REQUEST', id);
    }

    // Send email notification to requester
    try {
      // Get org details for email
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true },
      });

      if (currentRequest.requester.email) {
        const emailContent = purchaseRequestStatusEmail({
          referenceNumber: purchaseRequest.referenceNumber,
          userName: currentRequest.requester.name || currentRequest.requester.email,
          title: purchaseRequest.title,
          previousStatus: getStatusLabel(currentRequest.status),
          newStatus: getStatusLabel(status),
          reviewNotes: reviewNotes || undefined,
          reviewerName: session.user.name || session.user.email,
          orgSlug: org?.slug || 'app',
          orgName: org?.name || 'Organization',
        });

        await sendEmail({
          to: currentRequest.requester.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }
    } catch (emailError) {
      console.error('Failed to send status notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Send in-app notification for approved/rejected status
    if (status === 'APPROVED') {
      await createNotification(
        NotificationTemplates.purchaseRequestApproved(
          currentRequest.requesterId,
          purchaseRequest.referenceNumber,
          purchaseRequest.id
        ),
        tenantId
      );
    } else if (status === 'REJECTED') {
      await createNotification(
        NotificationTemplates.purchaseRequestRejected(
          currentRequest.requesterId,
          purchaseRequest.referenceNumber,
          reviewNotes || undefined,
          purchaseRequest.id
        ),
        tenantId
      );
    }

    return NextResponse.json(purchaseRequest);
}

export const PATCH = withErrorHandler(updateStatusHandler, { requireAdmin: true, requireModule: 'purchase-requests' });
