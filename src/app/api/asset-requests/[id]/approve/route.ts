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
import { assetRequestApprovedEmail, assetReturnApprovedEmail } from '@/features/asset-requests';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';
import logger from '@/lib/core/log';

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
    // STEP 4: Determine new status and activity based on type
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
    // STEP 5: Update request and handle asset changes in transaction
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
    try {
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true, primaryColor: true },
      });
      const orgSlug = org?.slug || 'app';
      const orgName = org?.name || 'Durj';
      const primaryColor = org?.primaryColor || undefined;

      if (assetRequest.member?.email) {
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
      }
    } catch (emailError) {
      logger.error({
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        requestId: id,
        requestNumber: assetRequest.requestNumber,
      }, 'Failed to send email notification for asset request approval');
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

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(approveAssetRequestHandler, { requireAdmin: true, requireModule: 'assets' });
