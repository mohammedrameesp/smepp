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
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus, AssetStatus, AssetHistoryAction, TeamMemberRole } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { acceptAssetAssignmentSchema } from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canUserRespond } from '@/features/asset-requests';
import { sendBatchEmails } from '@/lib/core/email';
import { assetAssignmentAcceptedEmail } from '@/lib/email-templates';
import { createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

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
 *   "asset": { "assetTag": "BCE-CP-25001", "status": "IN_USE" }
 * }
 */
async function acceptAssetAssignmentHandler(request: NextRequest, context: APIContext) {
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

    const validation = acceptAssetAssignmentSchema.safeParse(body);
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
        assignedByMember: { select: { id: true, name: true, email: true } },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Verify only target member can accept
    // ─────────────────────────────────────────────────────────────────────────────
    if (assetRequest.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Check if user can respond to this request
    // ─────────────────────────────────────────────────────────────────────────────
    if (!canUserRespond(assetRequest.status, assetRequest.type)) {
      return NextResponse.json({ error: 'Cannot accept this assignment' }, { status: 400 });
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
          processedById: session.user.id,
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
          assignedMemberId: session.user.id,
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
          toMemberId: session.user.id,
          fromStatus: assetRequest.asset.status,
          toStatus: AssetStatus.IN_USE,
          notes: isReassignment
            ? `Reassigned via request ${assetRequest.requestNumber}`
            : `Assigned via request ${assetRequest.requestNumber}`,
          performedById: session.user.id,
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Notify all admins via email and in-app
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      const org = await prisma.organization.findUnique({
        where: { id: tenantId },
        select: { slug: true, name: true },
      });
      const orgSlug = org?.slug || 'app';
      const orgName = org?.name || 'Durj';

      // Get all admins in tenant
      const admins = await prisma.teamMember.findMany({
        where: {
          tenantId,
          role: TeamMemberRole.ADMIN,
        },
        select: { id: true, email: true },
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
      });
      await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

      // Send in-app notifications to all admins
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
    } catch (emailError) {
      console.error('Failed to send notification:', emailError);
    }

    return NextResponse.json(updatedRequest);
}

export const POST = withErrorHandler(acceptAssetAssignmentHandler, { requireAuth: true, requireModule: 'assets' });
