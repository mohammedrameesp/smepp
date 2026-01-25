/**
 * @file route.ts
 * @description Update spend request status (approve, reject, complete)
 * @module projects/spend-requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updateSpendRequestStatusSchema } from '@/lib/validations/projects/spend-request';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { getAllowedStatusTransitions, getStatusLabel } from '@/features/spend-requests/lib/spend-request-utils';
import { sendEmail } from '@/lib/core/email';
import { handleEmailFailure } from '@/lib/core/email-failure-handler';
import { spendRequestStatusEmail } from '@/lib/core/email-templates';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import logger from '@/lib/core/log';
import { invalidateTokensForEntity, notifyApproversViaWhatsApp } from '@/lib/whatsapp';
import {
  getApprovalChain,
  getApprovalChainSummary,
  getCurrentPendingStep,
  getApproversForRole,
  hasApprovalChain,
  canMemberApprove,
} from '@/features/approvals/lib';

// PATCH - Update spend request status (admin only)
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
    const currentRequest = await db.spendRequest.findFirst({
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
      return NextResponse.json({ error: 'Spend request not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateSpendRequestStatusSchema.safeParse(body);

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

    // ─────────────────────────────────────────────────────────────────────────────
    // Handle approval chain for APPROVED/REJECTED status
    // ─────────────────────────────────────────────────────────────────────────────
    // Track if we sent notifications via approval chain to avoid duplicates
    let notificationsSentViaChain = false;

    if (status === 'APPROVED' || status === 'REJECTED') {
      const chainExists = await hasApprovalChain('SPEND_REQUEST', id);

      if (chainExists) {
        // Get current pending step
        const pendingStep = await getCurrentPendingStep('SPEND_REQUEST', id);

        if (pendingStep) {
          // Check if user can approve this step
          const canApproveResult = await canMemberApprove(userId, pendingStep, currentRequest.requesterId);

          if (!canApproveResult.canApprove) {
            return NextResponse.json({ error: canApproveResult.reason || 'Not authorized to approve' }, { status: 403 });
          }

          // Process the step atomically
          const now = new Date();
          const newStepStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
          const updateResult = await prisma.approvalStep.updateMany({
            where: {
              id: pendingStep.id,
              status: 'PENDING', // Atomic check to prevent race conditions
            },
            data: {
              status: newStepStatus,
              approverId: userId,
              actionAt: now,
              notes: reviewNotes,
            },
          });

          if (updateResult.count === 0) {
            return NextResponse.json({ error: 'Step already processed' }, { status: 400 });
          }

          // If rejected, skip all remaining steps
          if (status === 'REJECTED') {
            await prisma.approvalStep.updateMany({
              where: {
                entityType: 'SPEND_REQUEST',
                entityId: id,
                status: 'PENDING',
              },
              data: {
                status: 'SKIPPED',
              },
            });
          }

          // Check if chain is now complete
          const remainingPending = await prisma.approvalStep.count({
            where: {
              entityType: 'SPEND_REQUEST',
              entityId: id,
              status: 'PENDING',
            },
          });

          const isChainComplete = remainingPending === 0;

          // Mark that we'll handle notifications via the chain
          // This prevents duplicate notifications when falling through to the general update
          if (isChainComplete) {
            notificationsSentViaChain = true;

            // Send notification to requester that chain is complete
            if (status === 'APPROVED') {
              await createNotification(
                NotificationTemplates.spendRequestApproved(
                  currentRequest.requesterId,
                  currentRequest.referenceNumber,
                  id
                ),
                tenantId
              );
            } else if (status === 'REJECTED') {
              await createNotification(
                NotificationTemplates.spendRequestRejected(
                  currentRequest.requesterId,
                  currentRequest.referenceNumber,
                  reviewNotes || undefined,
                  id
                ),
                tenantId
              );
            }
          }

          // If chain not complete and approved, notify next level approvers
          if (!isChainComplete && status === 'APPROVED') {
            // Get org info for notifications
            const org = await prisma.organization.findUnique({
              where: { id: tenantId },
              select: { slug: true, name: true, primaryColor: true },
            });

            try {
              const nextPendingStep = await getCurrentPendingStep('SPEND_REQUEST', id);

              if (nextPendingStep) {
                const nextLevelApprovers = await getApproversForRole(
                  nextPendingStep.requiredRole,
                  tenantId,
                  currentRequest.requesterId
                );

                // Filter out the requester
                const filteredApprovers = nextLevelApprovers.filter(a => a.id !== currentRequest.requesterId);

                if (filteredApprovers.length > 0) {
                  // Send WhatsApp notifications to next level approvers
                  notifyApproversViaWhatsApp(
                    tenantId,
                    'SPEND_REQUEST',
                    id,
                    nextPendingStep.requiredRole,
                    currentRequest.requesterId // Pass requester ID for role-based routing
                  );

                  // Send in-app notifications
                  const notifications = filteredApprovers.map(approver => ({
                    recipientId: approver.id,
                    type: 'APPROVAL_PENDING' as const,
                    title: 'Spend Request Pending Your Approval',
                    message: `${currentRequest.requester?.name || 'Employee'}'s purchase request (${currentRequest.referenceNumber}) has been forwarded to you for approval.`,
                    link: `/admin/spend-requests/${id}`,
                    entityType: 'SpendRequest',
                    entityId: id,
                  }));
                  await createBulkNotifications(notifications, tenantId);

                  // Send email notifications
                  if (org) {
                    for (const approver of filteredApprovers) {
                      sendEmail({
                        to: approver.email,
                        subject: `Spend Request Pending: ${currentRequest.referenceNumber}`,
                        html: `<p>${currentRequest.requester?.name || 'Employee'}'s purchase request (${currentRequest.referenceNumber}) requires your approval.</p>`,
                        text: `${currentRequest.requester?.name || 'Employee'}'s purchase request (${currentRequest.referenceNumber}) requires your approval.`,
                      }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send purchase approval forward email'));
                    }
                  }
                }
              }
            } catch (notifyError) {
              logger.error({ error: notifyError instanceof Error ? notifyError.message : 'Unknown error', spendRequestId: id }, 'Failed to send next level approval notifications');
            }

            // Return partial approval response
            const updatedChain = await getApprovalChain('SPEND_REQUEST', id);
            const chainSummary = await getApprovalChainSummary('SPEND_REQUEST', id);

            return NextResponse.json({
              message: `Approval step completed. Waiting for remaining approvals.`,
              approvalChain: updatedChain,
              approvalSummary: chainSummary,
              currentStep: chainSummary.currentStep,
            });
          }

          // Chain is complete - proceed with final status update below
        }
      }
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
    const spendRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.spendRequest.update({
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
      await tx.spendRequestHistory.create({
        data: {
          spendRequestId: id,
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
    let activityAction: string = ActivityActions.SPEND_REQUEST_STATUS_CHANGED;
    if (status === 'APPROVED') {
      activityAction = ActivityActions.SPEND_REQUEST_APPROVED;
    } else if (status === 'REJECTED') {
      activityAction = ActivityActions.SPEND_REQUEST_REJECTED;
    } else if (status === 'COMPLETED') {
      activityAction = ActivityActions.SPEND_REQUEST_COMPLETED;
    }

    // Log activity
    await logAction(
      tenantId,
      userId,
      activityAction,
      'SpendRequest',
      spendRequest.id,
      {
        referenceNumber: spendRequest.referenceNumber,
        previousStatus: currentRequest.status,
        newStatus: status,
        reviewNotes,
      }
    );

    // NOTIF-004: Invalidate any pending WhatsApp action tokens for this request
    if (status === 'APPROVED' || status === 'REJECTED') {
      await invalidateTokensForEntity('SPEND_REQUEST', id);
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
      const emailContent = spendRequestStatusEmail({
        referenceNumber: spendRequest.referenceNumber,
        userName: currentRequest.requester.name || currentRequest.requester.email,
        title: spendRequest.title,
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
          spendRequestId: spendRequest.id,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        }, 'Failed to send status notification email');

        // Notify admins and super admin about email failure
        await handleEmailFailure({
          module: 'spend-requests',
          action: `status-${status.toLowerCase()}`,
          tenantId,
          organizationName: orgName,
          organizationSlug: orgSlug,
          recipientEmail: currentRequest.requester.email,
          recipientName: currentRequest.requester.name || currentRequest.requester.email,
          emailSubject: emailContent.subject,
          error: emailError instanceof Error ? emailError.message : String(emailError),
          metadata: {
            spendRequestId: spendRequest.id,
            referenceNumber: spendRequest.referenceNumber,
            previousStatus: currentRequest.status,
            newStatus: status,
          },
        }).catch(() => {}); // Non-blocking
      }
    }

    // Send in-app notification for approved/rejected status
    // Skip if already sent via approval chain to prevent duplicate notifications
    if (!notificationsSentViaChain) {
      if (status === 'APPROVED') {
        await createNotification(
          NotificationTemplates.spendRequestApproved(
            currentRequest.requesterId,
            spendRequest.referenceNumber,
            spendRequest.id
          ),
          tenantId
        );
      } else if (status === 'REJECTED') {
        await createNotification(
          NotificationTemplates.spendRequestRejected(
            currentRequest.requesterId,
            spendRequest.referenceNumber,
            reviewNotes || undefined,
            spendRequest.id
          ),
          tenantId
        );
      }
    }

    // Include approval chain info in response if chain existed
    if (status === 'APPROVED' || status === 'REJECTED') {
      const chainExists = await hasApprovalChain('SPEND_REQUEST', id);
      if (chainExists) {
        const updatedChain = await getApprovalChain('SPEND_REQUEST', id);
        const chainSummary = await getApprovalChainSummary('SPEND_REQUEST', id);
        return NextResponse.json({
          ...spendRequest,
          approvalChain: updatedChain,
          approvalSummary: chainSummary,
          message: status === 'APPROVED' ? 'Spend request fully approved' : 'Spend request rejected',
        });
      }
    }

    return NextResponse.json(spendRequest);
}

export const PATCH = withErrorHandler(updateStatusHandler, { requireCanApprove: true, requireModule: 'spend-requests' });
