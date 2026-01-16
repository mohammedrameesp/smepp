/**
 * @file route.ts
 * @description Asset request approval API endpoint
 * @module api/asset-requests/[id]/approve
 *
 * FEATURES:
 * - Approve employee requests (moves to PENDING_USER_ACCEPTANCE)
 * - Approve return requests (unassigns asset, marks as SPARE)
 * - Creates history entry and asset history for returns
 * - Sends email and in-app notifications
 * - Invalidates WhatsApp action tokens
 *
 * APPROVAL FLOWS:
 * - EMPLOYEE_REQUEST: PENDING_ADMIN_APPROVAL → PENDING_USER_ACCEPTANCE
 *   (User must still accept the assignment)
 * - RETURN_REQUEST: PENDING_RETURN_APPROVAL → APPROVED
 *   (Asset is immediately unassigned and marked SPARE)
 *
 * SECURITY:
 * - Admin role required
 * - Assets module must be enabled
 * - Tenant-isolated (prevents IDOR attacks)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, AssetRequestType, AssetStatus, AssetHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { approveAssetRequestSchema } from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canAdminProcess } from '@/features/asset-requests';
import { sendEmail } from '@/lib/core/email';
import { handleEmailFailure } from '@/lib/core/email-failure-handler';
import { assetRequestApprovedEmail, assetReturnApprovedEmail } from '@/lib/core/asset-request-emails';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity, notifyApproversViaWhatsApp } from '@/lib/whatsapp';
import logger from '@/lib/core/log';
import {
  getApprovalChain,
  getApprovalChainSummary,
  getCurrentPendingStep,
  getApproversForRole,
  hasApprovalChain,
  canMemberApprove,
} from '@/features/approvals/lib';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Process approval chain step
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process the approval chain for an asset request.
 * Returns information about whether the chain is complete or needs more approvals.
 */
async function processApprovalChainStep(
  requestId: string,
  approverId: string,
  tenantId: string,
  requesterId: string,
  notes?: string
): Promise<{
  chainExists: boolean;
  isChainComplete: boolean;
  stepApproved: boolean;
  error?: string;
}> {
  // Check if approval chain exists
  const chainExists = await hasApprovalChain('ASSET_REQUEST', requestId);

  if (!chainExists) {
    return { chainExists: false, isChainComplete: true, stepApproved: false };
  }

  // Get current pending step
  const pendingStep = await getCurrentPendingStep('ASSET_REQUEST', requestId);

  if (!pendingStep) {
    // No pending steps - chain already complete
    return { chainExists: true, isChainComplete: true, stepApproved: false };
  }

  // Check if user can approve this step
  const canApproveResult = await canMemberApprove(approverId, pendingStep, requesterId);

  if (!canApproveResult.canApprove) {
    return {
      chainExists: true,
      isChainComplete: false,
      stepApproved: false,
      error: canApproveResult.reason || 'Not authorized to approve',
    };
  }

  // Approve the step atomically
  const now = new Date();
  const updateResult = await prisma.approvalStep.updateMany({
    where: {
      id: pendingStep.id,
      status: 'PENDING', // Atomic check to prevent race conditions
    },
    data: {
      status: 'APPROVED',
      approverId,
      actionAt: now,
      notes,
    },
  });

  if (updateResult.count === 0) {
    return {
      chainExists: true,
      isChainComplete: false,
      stepApproved: false,
      error: 'Step already processed',
    };
  }

  // Check if chain is now complete
  const remainingPending = await prisma.approvalStep.count({
    where: {
      entityType: 'ASSET_REQUEST',
      entityId: requestId,
      status: 'PENDING',
    },
  });

  return {
    chainExists: true,
    isChainComplete: remainingPending === 0,
    stepApproved: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/asset-requests/[id]/approve - Approve Request
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Approve an asset request (employee request or return request).
 *
 * For EMPLOYEE_REQUEST:
 * - Changes status to PENDING_USER_ACCEPTANCE
 * - Sets admin as assigner
 * - User must still accept the assignment
 *
 * For RETURN_REQUEST:
 * - Changes status to APPROVED
 * - Unassigns asset from member
 * - Changes asset status to SPARE
 * - Creates asset history entry
 *
 * @route POST /api/asset-requests/[id]/approve
 *
 * @param {string} id - Request ID (path parameter)
 *
 * @body {string} [notes] - Admin notes for the approval
 *
 * @returns {AssetRequest} Updated request with asset and member info
 *
 * @throws {400} ID is required
 * @throws {400} Invalid request body
 * @throws {400} Cannot approve this request (invalid state or type)
 * @throws {403} Organization context required
 * @throws {404} Asset request not found
 *
 * @example Request body:
 * { "notes": "Approved for new project assignment" }
 *
 * @example Response:
 * {
 *   "id": "clx...",
 *   "requestNumber": "AR-25-001",
 *   "status": "PENDING_USER_ACCEPTANCE",
 *   "processedById": "admin-id",
 *   "processedAt": "2025-01-05T..."
 * }
 */
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Validate request body
    // ─────────────────────────────────────────────────────────────────────────────
    const body = await request.json();

    const validation = approveAssetRequestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { notes } = validation.data;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Fetch request (tenant-scoped for IDOR prevention)
    // ─────────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Check if admin can process this request
    // ─────────────────────────────────────────────────────────────────────────────
    if (!canAdminProcess(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot approve this request' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Process approval chain (if exists)
    // ─────────────────────────────────────────────────────────────────────────────
    const chainResult = await processApprovalChainStep(
      id,
      session.user.id,
      tenantId,
      assetRequest.memberId!, // memberId is required in schema
      notes ?? undefined
    );

    // If chain exists but user can't approve, return error
    if (chainResult.chainExists && chainResult.error) {
      return NextResponse.json({ error: chainResult.error }, { status: 403 });
    }

    // If chain exists and step was approved but chain not complete, notify next approvers
    if (chainResult.chainExists && chainResult.stepApproved && !chainResult.isChainComplete) {
      // Get org info for notifications
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true, primaryColor: true },
      });

      // Notify next level approvers
      try {
        const nextPendingStep = await getCurrentPendingStep('ASSET_REQUEST', id);

        if (nextPendingStep) {
          const nextLevelApprovers = await getApproversForRole(
            nextPendingStep.requiredRole,
            tenantId,
            assetRequest.memberId
          );

          // Filter out the requester
          const filteredApprovers = nextLevelApprovers.filter(a => a.id !== assetRequest.memberId);

          if (filteredApprovers.length > 0) {
            // Send WhatsApp notifications to next level approvers
            notifyApproversViaWhatsApp(
              tenantId,
              'ASSET_REQUEST',
              id,
              nextPendingStep.requiredRole
            );

            // Send in-app notifications
            const notifications = filteredApprovers.map(approver => ({
              recipientId: approver.id,
              type: 'APPROVAL_PENDING' as const,
              title: 'Asset Request Pending Your Approval',
              message: `${assetRequest.member?.name || 'Employee'}'s request (${assetRequest.requestNumber}) for asset ${assetRequest.asset.assetTag || assetRequest.asset.model} has been forwarded to you for approval.`,
              link: `/admin/asset-requests/${id}`,
              entityType: 'AssetRequest',
              entityId: id,
            }));
            await createBulkNotifications(notifications, tenantId);

            // Send email notifications
            if (org) {
              for (const approver of filteredApprovers) {
                sendEmail({
                  to: approver.email,
                  subject: `Asset Request Pending: ${assetRequest.requestNumber}`,
                  html: `<p>${assetRequest.member?.name || 'Employee'}'s asset request (${assetRequest.requestNumber}) requires your approval.</p>`,
                  text: `${assetRequest.member?.name || 'Employee'}'s asset request (${assetRequest.requestNumber}) requires your approval.`,
                }).catch(err => logger.error({ error: err instanceof Error ? err.message : 'Unknown error' }, 'Failed to send asset approval forward email'));
              }
            }
          }
        }
      } catch (notifyError) {
        logger.error({ error: notifyError instanceof Error ? notifyError.message : 'Unknown error', assetRequestId: id }, 'Failed to send next level approval notifications');
      }

      // Get chain summary for response
      const updatedChain = await getApprovalChain('ASSET_REQUEST', id);
      const chainSummary = await getApprovalChainSummary('ASSET_REQUEST', id);

      return NextResponse.json({
        message: `Approval step completed. Waiting for remaining approvals.`,
        approvalChain: updatedChain,
        approvalSummary: chainSummary,
        currentStep: chainSummary.currentStep,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Determine new status and activity based on type
    // Chain is either complete or doesn't exist - proceed with final approval
    // ─────────────────────────────────────────────────────────────────────────────
    let newStatus: AssetRequestStatus;
    let activityAction: string;

    if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
      // Employee request approved → now pending user acceptance
      newStatus = AssetRequestStatus.PENDING_USER_ACCEPTANCE;
      activityAction = ActivityActions.ASSET_REQUEST_APPROVED;
    } else if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
      // Return approved → asset unassigned
      newStatus = AssetRequestStatus.APPROVED;
      activityAction = ActivityActions.ASSET_RETURN_APPROVED;
    } else {
      return NextResponse.json({ error: 'Invalid request type for approval' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Update request and handle asset changes in transaction
    // ─────────────────────────────────────────────────────────────────────────────
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: newStatus,
          processedById: session.user.id,
          processedAt: new Date(),
          processorNotes: notes,
          // For employee requests, set the admin as assigner
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

        // Create asset history entry for the return
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Invalidate WhatsApp action tokens (if any pending)
    // ─────────────────────────────────────────────────────────────────────────────
    await invalidateTokensForEntity('ASSET_REQUEST', id);

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 8: Send email notifications
    // ─────────────────────────────────────────────────────────────────────────────
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, primaryColor: true },
    });
    const orgSlug = org?.slug || 'app';
    const orgName = org?.name || 'Durj';
    const primaryColor = org?.primaryColor || undefined;

    if (assetRequest.member?.email) {
      try {
        if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
          // Notify user that their request was approved
          const emailData = assetRequestApprovedEmail({
            requestNumber: assetRequest.requestNumber,
            assetTag: assetRequest.asset?.assetTag || null,
            assetModel: assetRequest.asset?.model || '',
            assetBrand: assetRequest.asset?.brand || null,
            assetType: assetRequest.asset?.type || '',
            userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
            approverName: session.user.name || session.user.email || 'Admin',
            orgSlug,
            orgName,
            primaryColor,
          });
          await sendEmail({ to: assetRequest.member.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
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
            primaryColor,
          });
          await sendEmail({ to: assetRequest.member.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
        }
      } catch (emailError) {
        logger.error({
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          requestId: id,
          requestNumber: assetRequest.requestNumber,
        }, 'Failed to send email notification for asset request approval');

        // Notify admins and super admin about email failure
        await handleEmailFailure({
          module: 'asset-requests',
          action: assetRequest.type === AssetRequestType.RETURN_REQUEST ? 'return-approval' : 'request-approval',
          tenantId,
          organizationName: orgName,
          organizationSlug: orgSlug,
          recipientEmail: assetRequest.member.email,
          recipientName: assetRequest.member.name || assetRequest.member.email,
          emailSubject: `Asset ${assetRequest.type === AssetRequestType.RETURN_REQUEST ? 'Return' : 'Request'} Approved`,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          metadata: {
            requestId: id,
            requestNumber: assetRequest.requestNumber,
            assetTag: assetRequest.asset?.assetTag,
          },
        }).catch(() => {}); // Non-blocking
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 9: Send in-app notification
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      await createNotification(
        NotificationTemplates.assetRequestApproved(
          assetRequest.memberId,
          assetRequest.asset?.assetTag || assetRequest.asset?.model || 'Asset',
          assetRequest.requestNumber,
          id
        ),
        tenantId
      );
    } catch (notifError) {
      logger.error({
        error: notifError instanceof Error ? notifError.message : 'Unknown error',
        requestId: id,
        requestNumber: assetRequest.requestNumber,
      }, 'Failed to send in-app notification for asset request approval');
    }

    // Include approval chain info in response (if chain existed)
    if (chainResult.chainExists) {
      const updatedChain = await getApprovalChain('ASSET_REQUEST', id);
      const chainSummary = await getApprovalChainSummary('ASSET_REQUEST', id);
      return NextResponse.json({
        ...updatedRequest,
        approvalChain: updatedChain,
        approvalSummary: chainSummary,
        message: 'Asset request fully approved',
      });
    }

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(approveAssetRequestHandler, { requireCanApprove: true, requireModule: 'assets' });
