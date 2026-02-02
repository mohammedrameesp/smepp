/**
 * @file route.ts
 * @description Asset assignment acceptance API endpoint
 * @module api/asset-requests/[id]/accept
 *
 * FEATURES:
 * - User accepts an asset assignment
 * - Assigns asset to user (status → IN_USE)
 * - Creates asset history entry
 * - Notifies all admins via email and in-app
 *
 * ACCEPTANCE FLOW:
 * - Request: PENDING_USER_ACCEPTANCE → ACCEPTED
 * - Asset: SPARE → IN_USE (assigned to member)
 *
 * This endpoint is called when:
 * 1. Admin created ADMIN_ASSIGNMENT and user accepts
 * 2. Employee's EMPLOYEE_REQUEST was approved and user accepts
 *
 * SECURITY:
 * - Only the target member can accept their assignment
 * - Auth required
 * - Assets module must be enabled
 * - Tenant-isolated
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { AssetRequestStatus, AssetStatus, AssetHistoryAction } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { acceptAssetAssignmentSchema } from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canUserRespond } from '@/features/asset-requests';
import { sendBatchEmails, handleEmailFailure, assetAssignmentAcceptedEmail } from '@/lib/email';
import { createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse, forbiddenResponse, validationErrorResponse } from '@/lib/http/errors';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/asset-requests/[id]/accept - Accept Assignment
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Accept an asset assignment.
 * Only the target member can accept their own assignment.
 *
 * Actions performed:
 * 1. Updates request status to ACCEPTED
 * 2. Assigns asset to user (assignedMemberId, assignmentDate)
 * 3. Changes asset status to IN_USE
 * 4. Creates asset history entry
 * 5. Creates request history entry
 * 6. Notifies all admins
 *
 * @route POST /api/asset-requests/[id]/accept
 *
 * @param {string} id - Request ID (path parameter)
 *
 * @body {string} [notes] - Optional acceptance notes
 *
 * @returns {AssetRequest} Updated request with asset and member info
 *
 * @throws {400} ID is required
 * @throws {400} Invalid request body
 * @throws {400} Cannot accept this assignment (invalid state)
 * @throws {403} Organization context required
 * @throws {403} Access denied (not the target member)
 * @throws {404} Asset request not found
 *
 * @example Request body:
 * { "notes": "Received in good condition" }
 *
 * @example Response:
 * {
 *   "id": "clx...",
 *   "requestNumber": "AR-25-001",
 *   "status": "ACCEPTED",
 *   "asset": { "assetTag": "ORG-CP-25001", "status": "IN_USE" }
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
  // STEP 1: Validate request body
  // ─────────────────────────────────────────────────────────────────────────────
  const body = await request.json();

  const validation = acceptAssetAssignmentSchema.safeParse(body);
  if (!validation.success) {
    return validationErrorResponse(validation);
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
      assignedByMember: { select: { id: true, name: true, email: true } },
    },
  });

  if (!assetRequest) {
    return notFoundResponse('Asset request not found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Verify only target member can accept
  // ─────────────────────────────────────────────────────────────────────────────
  if (assetRequest.memberId !== userId) {
    return forbiddenResponse('Access denied');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Check if user can respond to this request
  // ─────────────────────────────────────────────────────────────────────────────
  if (!canUserRespond(assetRequest.status, assetRequest.type)) {
    return badRequestResponse('Cannot accept this assignment');
  }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Accept assignment in transaction
    // ─────────────────────────────────────────────────────────────────────────────
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.ACCEPTED,
          processedById: userId,
          processedAt: new Date(),
          processorNotes: notes,
        },
        include: {
          asset: {
            select: { id: true, assetTag: true, model: true, brand: true, type: true },
          },
          member: { select: { id: true, name: true, email: true } },
        },
      });

      // Assign the asset to the member
      await tx.asset.update({
        where: { id: assetRequest.assetId },
        data: {
          assignedMemberId: userId,
          assignmentDate: new Date(),
          status: AssetStatus.IN_USE,
        },
      });

      // Create asset history entry (handle both fresh assignment and reassignment)
      const isReassignment = assetRequest.asset.assignedMemberId !== null;
      await tx.assetHistory.create({
        data: {
          tenantId,
          assetId: assetRequest.assetId,
          action: AssetHistoryAction.ASSIGNED,
          fromMemberId: assetRequest.asset.assignedMemberId, // Previous owner (null if fresh assignment)
          toMemberId: userId,
          fromStatus: assetRequest.asset.status,
          toStatus: AssetStatus.IN_USE,
          notes: isReassignment
            ? `Reassigned via request ${assetRequest.requestNumber}`
            : `Assigned via request ${assetRequest.requestNumber}`,
          performedById: userId,
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
          performedById: userId,
        },
      });

      return updated;
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
      userId,
      ActivityActions.ASSET_ASSIGNMENT_ACCEPTED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        assetModel: assetRequest.asset.model,
      }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Notify all admins via email and in-app
    // ─────────────────────────────────────────────────────────────────────────────
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, primaryColor: true },
    });
    const orgSlug = org?.slug || 'app';
    const orgName = org?.name || 'Durj';
    const primaryColor = org?.primaryColor || undefined;

    // Get all admins in tenant
    const admins = await prisma.teamMember.findMany({
      where: {
        tenantId,
        isAdmin: true,
      },
      select: { id: true, email: true, name: true },
    });

    // Send batch email to all admins
    const emailData = assetAssignmentAcceptedEmail({
      requestNumber: assetRequest.requestNumber,
      assetTag: assetRequest.asset.assetTag,
      assetModel: assetRequest.asset.model,
      assetBrand: assetRequest.asset.brand,
      assetType: assetRequest.asset.type,
      userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
      userEmail: assetRequest.member?.email || '',
      orgSlug,
      orgName,
      primaryColor,
    });

    try {
      const result = await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

      // Check if any emails failed and notify super admin (parallel processing)
      if (!result.success && result.results.some(r => 'success' in r && !r.success)) {
        const failedAdmins = admins.filter((_, i) => 'success' in result.results[i] && !result.results[i].success);
        await Promise.all(failedAdmins.map(admin =>
          handleEmailFailure({
            module: 'asset-requests',
            action: 'assignment-accepted-notification',
            tenantId,
            organizationName: orgName,
            organizationSlug: orgSlug,
            recipientEmail: admin.email,
            recipientName: admin.name || admin.email,
            emailSubject: emailData.subject,
            error: 'Batch email failed',
            metadata: {
              requestId: id,
              requestNumber: assetRequest.requestNumber,
              assetTag: assetRequest.asset.assetTag,
            },
          }).catch(() => {}) // Non-blocking
        ));
      }
    } catch (emailError) {
      logger.error({
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        requestId: id,
        requestNumber: assetRequest.requestNumber,
      }, 'Failed to send notification for asset assignment acceptance');

      // Notify super admin about the failure
      await handleEmailFailure({
        module: 'asset-requests',
        action: 'assignment-accepted-notification',
        tenantId,
        organizationName: orgName,
        organizationSlug: orgSlug,
        recipientEmail: 'admins@' + orgSlug,
        recipientName: 'Organization Admins',
        emailSubject: emailData.subject,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        metadata: {
          requestId: id,
          requestNumber: assetRequest.requestNumber,
          assetTag: assetRequest.asset.assetTag,
          adminCount: admins.length,
        },
      }).catch(() => {}); // Non-blocking
    }

    // Send in-app notifications to all admins
    try {
      const notifications = admins.map(admin =>
        NotificationTemplates.assetAssignmentAccepted(
          admin.id,
          assetRequest.member?.name || assetRequest.member?.email || 'Employee',
          assetRequest.asset.assetTag || '',
          assetRequest.asset.model,
          assetRequest.requestNumber,
          id
        )
      );
      await createBulkNotifications(notifications, tenantId);
    } catch (notifError) {
      logger.error({
        error: notifError instanceof Error ? notifError.message : 'Unknown error',
        requestId: id,
      }, 'Failed to send in-app notifications for assignment acceptance');
    }

  return NextResponse.json(updatedRequest);
}, { requireAuth: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
