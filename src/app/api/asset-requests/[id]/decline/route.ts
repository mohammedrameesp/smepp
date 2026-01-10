/**
 * @file route.ts
 * @description Asset assignment decline API endpoint
 * @module api/asset-requests/[id]/decline
 *
 * FEATURES:
 * - User declines an asset assignment
 * - Requires decline reason for audit trail
 * - Asset remains available (not assigned)
 * - Notifies all admins via email and in-app
 *
 * DECLINE OUTCOME:
 * - Request: PENDING_USER_ACCEPTANCE → REJECTED_BY_USER
 * - Asset: Remains as SPARE (never assigned)
 * - Admin can then reassign to someone else
 *
 * USE CASES:
 * - User doesn't need the asset
 * - Wrong asset type assigned
 * - User leaving the organization
 *
 * SECURITY:
 * - Only the target member can decline their assignment
 * - Auth required
 * - Assets module must be enabled
 * - Tenant-isolated
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, TeamMemberRole } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { declineAssetAssignmentSchema } from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canUserRespond } from '@/features/asset-requests';
import { sendBatchEmails } from '@/lib/core/email';
import { assetAssignmentDeclinedEmail } from '@/lib/email-templates';
import { createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/asset-requests/[id]/decline - Decline Assignment
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Decline an asset assignment.
 * Only the target member can decline their own assignment.
 *
 * Actions performed:
 * 1. Updates request status to REJECTED_BY_USER
 * 2. Creates request history entry with reason
 * 3. Notifies all admins (email + in-app)
 *
 * Note: Asset is NOT modified - it was never assigned in the first place.
 * The asset remains available in SPARE status for reassignment.
 *
 * @route POST /api/asset-requests/[id]/decline
 *
 * @param {string} id - Request ID (path parameter)
 *
 * @body {string} reason - Decline reason (required for audit trail)
 *
 * @returns {AssetRequest} Updated request with asset and member info
 *
 * @throws {400} ID is required
 * @throws {400} Invalid request body (missing reason)
 * @throws {400} Cannot decline this assignment (invalid state)
 * @throws {403} Organization context required
 * @throws {403} Access denied (not the target member)
 * @throws {404} Asset request not found
 *
 * @example Request body:
 * { "reason": "I already have a laptop assigned to me" }
 *
 * @example Response:
 * {
 *   "id": "clx...",
 *   "requestNumber": "AR-25-001",
 *   "status": "REJECTED_BY_USER",
 *   "processorNotes": "I already have a laptop..."
 * }
 */
async function declineAssetAssignmentHandler(request: NextRequest, context: APIContext) {
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
    // STEP 1: Validate request body (reason is required)
    // ─────────────────────────────────────────────────────────────────────────────
    const body = await request.json();

    const validation = declineAssetAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
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
        assignedByMember: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Verify only target member can decline
    // ─────────────────────────────────────────────────────────────────────────────
    if (assetRequest.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Check if user can respond to this request
    // ─────────────────────────────────────────────────────────────────────────────
    if (!canUserRespond(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot decline this assignment' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Decline assignment in transaction
    // Note: We don't modify the asset - it was never actually assigned
    // ─────────────────────────────────────────────────────────────────────────────
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status
      const updated = await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.REJECTED_BY_USER,
          processedById: session.user.id,
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
          action: 'DECLINED',
          oldStatus: assetRequest.status,
          newStatus: AssetRequestStatus.REJECTED_BY_USER,
          notes: reason,
          performedById: session.user.id,
        },
      });

      return updated;
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_ASSIGNMENT_DECLINED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        declineReason: reason,
      }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Notify all admins via email and in-app
    // ─────────────────────────────────────────────────────────────────────────────
    try {
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
          role: TeamMemberRole.ADMIN,
        },
        select: { id: true, email: true },
      });

      // Send batch email to all admins
      const emailData = assetAssignmentDeclinedEmail({
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        assetModel: assetRequest.asset.model,
        assetBrand: assetRequest.asset.brand,
        assetType: assetRequest.asset.type,
        userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
        userEmail: assetRequest.member?.email || '',
        reason: reason || 'No reason provided',
        orgSlug,
        orgName,
        primaryColor: primaryColor || undefined,
      });
      await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

      // Send in-app notifications to all admins
      const notifications = admins.map(admin =>
        NotificationTemplates.assetAssignmentDeclined(
          admin.id,
          assetRequest.member?.name || assetRequest.member?.email || 'Employee',
          assetRequest.asset.assetTag || '',
          assetRequest.asset.model,
          assetRequest.requestNumber,
          reason,
          id
        )
      );
      await createBulkNotifications(notifications, tenantId);
    } catch (emailError) {
      logger.error({
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        requestId: id,
        requestNumber: assetRequest.requestNumber,
      }, 'Failed to send notification for asset assignment decline');
    }

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(declineAssetAssignmentHandler, { requireAuth: true, requireModule: 'assets' });
