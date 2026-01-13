/**
 * @file route.ts
 * @description Update purchase request status (approve, reject, complete)
 * @module projects/purchase-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updatePurchaseRequestStatusSchema } from '@/lib/validations/projects/purchase-request';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { getAllowedStatusTransitions, getStatusLabel } from '@/features/purchase-requests/lib/purchase-request-utils';
import { sendEmail } from '@/lib/core/email';
import { handleEmailFailure } from '@/lib/core/email-failure-handler';
import { purchaseRequestStatusEmail } from '@/lib/core/email-templates';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import logger from '@/lib/core/log';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

// PATCH - Update purchase request status (admin only)
async function updateStatusHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const userId = tenant.userId;

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get current request within tenant
    const currentRequest = await db.purchaseRequest.findFirst({
      where: { id },
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
    const updateData: Record<string, unknown> = {
      status,
      reviewedById: userId,
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
          performedById: userId,
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
      userId,
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
    // Get org details for email (use raw prisma for non-tenant model)
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, primaryColor: true },
    });
    const orgSlug = org?.slug || 'app';
    const orgName = org?.name || 'Organization';

    // Get user info for reviewer name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (currentRequest.requester.email) {
      const emailContent = purchaseRequestStatusEmail({
        referenceNumber: purchaseRequest.referenceNumber,
        userName: currentRequest.requester.name || currentRequest.requester.email,
        title: purchaseRequest.title,
        previousStatus: getStatusLabel(currentRequest.status),
        newStatus: getStatusLabel(status),
        reviewNotes: reviewNotes || undefined,
        reviewerName: user?.name || user?.email || 'Admin',
        orgSlug,
        orgName,
        primaryColor: org?.primaryColor || undefined,
      });

      try {
        await sendEmail({
          to: currentRequest.requester.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailError) {
        logger.error({
          tenantId,
          purchaseRequestId: purchaseRequest.id,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        }, 'Failed to send status notification email');

        // Notify admins and super admin about email failure
        await handleEmailFailure({
          module: 'purchase-requests',
          action: `status-${status.toLowerCase()}`,
          tenantId,
          organizationName: orgName,
          organizationSlug: orgSlug,
          recipientEmail: currentRequest.requester.email,
          recipientName: currentRequest.requester.name || currentRequest.requester.email,
          emailSubject: emailContent.subject,
          error: emailError instanceof Error ? emailError.message : String(emailError),
          metadata: {
            purchaseRequestId: purchaseRequest.id,
            referenceNumber: purchaseRequest.referenceNumber,
            previousStatus: currentRequest.status,
            newStatus: status,
          },
        }).catch(() => {}); // Non-blocking
      }
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
