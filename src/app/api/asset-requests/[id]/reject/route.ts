/**
 * @file route.ts
 * @description Asset request rejection API endpoint
 * @module api/asset-requests/[id]/reject
 *
 * FEATURES:
 * - Reject employee requests or return requests
 * - Requires rejection reason for audit trail
 * - Creates history entry
 * - Sends email and in-app notifications
 * - Invalidates WhatsApp action tokens
 *
 * REJECTION OUTCOME:
 * - Request status set to REJECTED
 * - No changes to asset (remains as-is)
 * - User notified via email and in-app notification
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
import { AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { rejectAssetRequestSchema } from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canAdminProcess } from '@/features/asset-requests';
import { sendEmail, handleEmailFailure, assetRequestRejectedEmail, assetReturnRejectedEmail } from '@/lib/email';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse, validationErrorResponse } from '@/lib/http/errors';
import { invalidateTokensForEntity } from '@/lib/whatsapp';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/asset-requests/[id]/reject - Reject Request
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reject an asset request (employee request or return request).
 *
 * For EMPLOYEE_REQUEST:
 * - Asset remains available for other requests
 *
 * For RETURN_REQUEST:
 * - Asset remains assigned to the member
 * - User must continue using the asset
 *
 * @route POST /api/asset-requests/[id]/reject
 *
 * @param {string} id - Request ID (path parameter)
 *
 * @body {string} reason - Rejection reason (required for audit trail)
 *
 * @returns {AssetRequest} Updated request with asset and member info
 *
 * @throws {400} ID is required
 * @throws {400} Invalid request body (missing reason)
 * @throws {400} Cannot reject this request (invalid state)
 * @throws {403} Organization context required
 * @throws {404} Asset request not found
 *
 * @example Request body:
 * { "reason": "Asset has already been assigned to another user" }
 *
 * @example Response:
 * {
 *   "id": "clx...",
 *   "requestNumber": "AR-25-001",
 *   "status": "REJECTED",
 *   "processorNotes": "Asset has already been assigned...",
 *   "processedById": "admin-id"
 * }
 */
export const POST = withErrorHandler(async (request: NextRequest, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const id = params?.id;
  if (!id) {
    return badRequestResponse('ID is required');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Validate request body (reason is required)
  // ─────────────────────────────────────────────────────────────────────────────
  const body = await request.json();

  const validation = rejectAssetRequestSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation);
  }

  const { reason } = validation.data;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Fetch request (tenant-scoped for IDOR prevention)
  // ─────────────────────────────────────────────────────────────────────────────
  const assetRequest = await prisma.assetRequest.findFirst({
    where: { id, tenantId },
    include: {
      asset: { select: { assetTag: true, model: true, brand: true, type: true } },
      member: { select: { id: true, name: true, email: true } },
    },
  });

  if (!assetRequest) {
    return notFoundResponse('Asset request not found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Check if admin can process this request
  // ─────────────────────────────────────────────────────────────────────────────
  if (!canAdminProcess(assetRequest.status, assetRequest.type)) {
    return badRequestResponse('Cannot reject this request');
  }

  // Get rejector info for notifications
  const rejectorMember = await prisma.teamMember.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const rejectorName = rejectorMember?.name || rejectorMember?.email || 'Admin';

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Update request in transaction
    // ─────────────────────────────────────────────────────────────────────────────
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status to REJECTED
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.REJECTED,
          processedById: userId,
          processedAt: new Date(),
          processorNotes: reason,
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
          action: 'REJECTED',
          oldStatus: assetRequest.status,
          newStatus: AssetRequestStatus.REJECTED,
          notes: reason,
          performedById: userId,
        },
      });

      return updated;
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
      userId,
      ActivityActions.ASSET_REQUEST_REJECTED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        rejectionReason: reason,
      }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Invalidate WhatsApp action tokens (if any pending)
    // ─────────────────────────────────────────────────────────────────────────────
    await invalidateTokensForEntity('ASSET_REQUEST', id);

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Send email notification to user
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
          const emailData = assetRequestRejectedEmail({
            requestNumber: assetRequest.requestNumber,
            assetTag: assetRequest.asset.assetTag,
            assetModel: assetRequest.asset.model,
            assetBrand: assetRequest.asset.brand,
            assetType: assetRequest.asset.type,
            userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
            rejectorName: rejectorName,
            reason: reason || 'No reason provided',
            orgSlug,
            orgName,
            primaryColor,
          });
          await sendEmail({ to: assetRequest.member.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
        } else if (assetRequest.type === AssetRequestType.RETURN_REQUEST) {
          const emailData = assetReturnRejectedEmail({
            requestNumber: assetRequest.requestNumber,
            assetTag: assetRequest.asset.assetTag,
            assetModel: assetRequest.asset.model,
            assetBrand: assetRequest.asset.brand,
            assetType: assetRequest.asset.type,
            userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
            rejectorName: rejectorName,
            reason: reason || 'No reason provided',
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
        }, 'Failed to send email notification for asset request rejection');

        // Notify admins and super admin about email failure
        await handleEmailFailure({
          module: 'asset-requests',
          action: assetRequest.type === AssetRequestType.RETURN_REQUEST ? 'return-rejection' : 'request-rejection',
          tenantId,
          organizationName: orgName,
          organizationSlug: orgSlug,
          recipientEmail: assetRequest.member.email,
          recipientName: assetRequest.member.name || assetRequest.member.email,
          emailSubject: `Asset ${assetRequest.type === AssetRequestType.RETURN_REQUEST ? 'Return' : 'Request'} Rejected`,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          metadata: {
            requestId: id,
            requestNumber: assetRequest.requestNumber,
            assetTag: assetRequest.asset.assetTag,
            rejectionReason: reason,
          },
        }).catch(() => {}); // Non-blocking
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 8: Send in-app notification
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      await createNotification(
        NotificationTemplates.assetRequestRejected(
          assetRequest.memberId,
          assetRequest.asset.assetTag || assetRequest.asset.model,
          assetRequest.requestNumber,
          reason,
          id
        ),
        tenantId
      );
    } catch (notifError) {
      logger.error({
        error: notifError instanceof Error ? notifError.message : 'Unknown error',
        requestId: id,
        requestNumber: assetRequest.requestNumber,
      }, 'Failed to send in-app notification for asset request rejection');
    }

  return NextResponse.json(updatedRequest);
}, { requireCanApprove: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
