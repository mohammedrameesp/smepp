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
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { rejectAssetRequestSchema } from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canAdminProcess } from '@/features/asset-requests';
import { sendEmail } from '@/lib/core/email';
import { assetRequestRejectedEmail, assetReturnRejectedEmail } from '@/lib/email-templates';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidateTokensForEntity } from '@/lib/whatsapp';

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
async function rejectAssetRequestHandler(request: NextRequest, context: APIContext) {
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

    const validation = rejectAssetRequestSchema.safeParse(body);
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
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Check if admin can process this request
    // ─────────────────────────────────────────────────────────────────────────────
    if (!canAdminProcess(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot reject this request' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Update request in transaction
    // ─────────────────────────────────────────────────────────────────────────────
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // Update request status to REJECTED
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
          performedById: session.user.id,
        },
      });

      return updated;
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Invalidate WhatsApp action tokens (if any pending)
    // ─────────────────────────────────────────────────────────────────────────────
    await invalidateTokensForEntity('ASSET_REQUEST', id);

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Send email notification to user
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true },
      });
      const orgSlug = org?.slug || 'app';
      const orgName = org?.name || 'Durj';

      if (assetRequest.member?.email) {
        if (assetRequest.type === AssetRequestType.EMPLOYEE_REQUEST) {
          const emailData = assetRequestRejectedEmail({
            requestNumber: assetRequest.requestNumber,
            assetTag: assetRequest.asset.assetTag,
            assetModel: assetRequest.asset.model,
            assetBrand: assetRequest.asset.brand,
            assetType: assetRequest.asset.type,
            userName: assetRequest.member?.name || assetRequest.member?.email || 'Employee',
            rejectorName: session.user.name || session.user.email || 'Admin',
            reason: reason || 'No reason provided',
            orgSlug,
            orgName,
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
            rejectorName: session.user.name || session.user.email || 'Admin',
            reason: reason || 'No reason provided',
            orgSlug,
            orgName,
          });
          await sendEmail({ to: assetRequest.member.email, subject: emailData.subject, html: emailData.html, text: emailData.text });
        }
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
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
      console.error('Failed to send in-app notification:', notifError);
    }

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(rejectAssetRequestHandler, { requireAdmin: true, requireModule: 'assets' });
