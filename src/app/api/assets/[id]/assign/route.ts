/**
 * @file route.ts
 * @description Asset assignment API with check-in/check-out workflow
 * @module api/assets/[id]/assign
 *
 * FEATURES:
 * - Assign asset to team member (check-in)
 * - Unassign asset from member (check-out)
 * - Reassignment from Person A to Person B
 * - Conditional acceptance based on user type (canLogin)
 * - Direct assign for users without login (drivers, etc.)
 * - Optional return request creation for unassignment
 * - Email notifications with admin fallback on failure
 * - Full audit trail via AssetHistory and AssetRequestHistory
 *
 * BUSINESS FLOWS:
 *
 * CHECK-IN (Assign):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. Validate member exists in same tenant                       │
 * │  2. If already assigned to same member → Error                  │
 * │  3. If assigned to different member → Unassign first            │
 * │  4. Check for pending requests                                  │
 * │  5. member.canLogin=false OR skipAcceptance → Direct assign     │
 * │  6. member.canLogin=true → Create PENDING_USER_ACCEPTANCE       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * CHECK-OUT (Unassign):
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. Validate asset is currently assigned                        │
 * │  2. createReturnRequest=false → Direct unassign                 │
 * │  3. createReturnRequest=true → Create PENDING_RETURN_APPROVAL   │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * SECURITY:
 * - Admin role required
 * - Assets module must be enabled
 * - All queries are tenant-scoped (tenantId)
 * - Cross-tenant access prevented
 *
 * @see /api/asset-requests/[id]/accept - User accepts assignment
 * @see /api/asset-requests/[id]/decline - User declines assignment
 * @see /api/asset-requests/[id]/approve - Admin approves return
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  AssetStatus,
  AssetRequestStatus,
  AssetRequestType,
  AssetHistoryAction,
} from '@prisma/client';
import { z } from 'zod';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { sendEmail } from '@/lib/core/email';
import { handleEmailFailure, getOrganizationContext } from '@/lib/core/email-failure-handler';
import { assetAssignmentEmail } from '@/lib/core/email-templates';
import { assetAssignmentPendingEmail } from '@/lib/core/asset-request-emails';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { generateRequestNumber } from '@/features/asset-requests';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Asset data used across handlers */
interface AssetData {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  type: string;
  serial: string | null;
  status: AssetStatus;
  assignedMemberId: string | null;
  assignedMember: MemberData | null;
}

/** Member data used across handlers */
interface MemberData {
  id: string;
  name: string | null;
  email: string;
  canLogin?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Request body schema for asset assignment/unassignment.
 *
 * @property assignedMemberId - Member ID to assign (null to unassign)
 * @property notes - Optional notes for the operation
 * @property skipAcceptance - Force direct assign even if user has login
 * @property createReturnRequest - Create return request instead of direct unassign
 */
const assignAssetSchema = z.object({
  assignedMemberId: z.string().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  skipAcceptance: z.boolean().optional().default(false),
  createReturnRequest: z.boolean().optional().default(false),
  assignmentDate: z.string().optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Notify admins when email notification fails.
 * Uses centralized handler to notify tenant admins (in-app) and super admin (email).
 *
 * @param tenantId - Tenant ID for isolation
 * @param context - Details about the failed notification
 */
async function notifyAdminsOfEmailFailure(
  tenantId: string,
  context: {
    action: 'assignment' | 'return_request' | 'unassignment' | 'reassignment';
    assetTag: string;
    memberName: string;
    memberEmail: string;
    emailSubject: string;
    error: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const org = await getOrganizationContext(tenantId);
    if (!org) {
      logger.error({ tenantId }, 'Could not get organization context for email failure notification');
      return;
    }

    await handleEmailFailure({
      module: 'assets',
      action: context.action,
      tenantId,
      organizationName: org.name,
      organizationSlug: org.slug,
      recipientEmail: context.memberEmail,
      recipientName: context.memberName,
      emailSubject: context.emailSubject,
      error: context.error,
      metadata: {
        assetTag: context.assetTag,
        ...context.metadata,
      },
    });
  } catch (error) {
    logger.error(
      { tenantId, action: context.action, assetTag: context.assetTag, error: error instanceof Error ? error.message : String(error) },
      'Failed to handle email failure notification'
    );
  }
}

/**
 * Get organization details for email templates.
 * Tenant-scoped query.
 */
async function getOrgDetails(tenantId: string): Promise<{ slug: string; name: string; primaryColor: string | null }> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { slug: true, name: true, primaryColor: true },
  });
  return { slug: org?.slug || 'app', name: org?.name || 'Durj', primaryColor: org?.primaryColor || null };
}

/**
 * Get admin member details.
 * Uses findFirst with tenantId for safety (though ID should be unique).
 */
async function getAdminDetails(
  adminId: string,
  tenantId: string
): Promise<{ name: string | null; email: string }> {
  const admin = await prisma.teamMember.findFirst({
    where: { id: adminId, tenantId },
    select: { name: true, email: true },
  });
  return { name: admin?.name || null, email: admin?.email || '' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: NOTIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send notifications for direct assignment.
 * Sends email + in-app notification to new assignee.
 * Notifies admins on email failure.
 *
 * @param asset - Asset being assigned
 * @param member - Member receiving the asset
 * @param previousMember - Previous assignee (for reassignment notification)
 * @param tenantId - Tenant ID for isolation
 */
async function sendAssignmentNotifications(
  asset: { id: string; assetTag: string | null; model: string; brand: string | null; type: string; serial: string | null },
  member: MemberData,
  previousMember: MemberData | null,
  tenantId: string
): Promise<void> {
  try {
    const org = await getOrgDetails(tenantId);

    // Email notification to new assignee
    if (member.email) {
      const emailContent = assetAssignmentEmail({
        userName: member.name || member.email,
        assetTag: asset.assetTag || 'N/A',
        assetType: asset.type,
        brand: asset.brand || 'N/A',
        model: asset.model,
        serialNumber: asset.serial || null,
        assignmentDate: new Date(),
        orgName: org.name,
        primaryColor: org.primaryColor || undefined,
      });

      try {
        await sendEmail({
          to: member.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (emailError) {
        await notifyAdminsOfEmailFailure(tenantId, {
          action: 'assignment',
          assetTag: asset.assetTag || asset.model,
          memberName: member.name || member.email,
          memberEmail: member.email,
          emailSubject: emailContent.subject,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          metadata: { assetId: asset.id, assetModel: asset.model },
        });
      }
    }

    // In-app notification to new assignee
    await createNotification(
      NotificationTemplates.assetAssigned(member.id, asset.assetTag || '', asset.model, asset.id),
      tenantId
    );

    // Notify previous assignee if this was a reassignment
    if (previousMember) {
      await createNotification(
        NotificationTemplates.assetUnassigned(previousMember.id, asset.assetTag || '', asset.model, asset.id),
        tenantId
      );
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', assetId: asset.id, memberId: member.id }, 'Error sending assignment notifications');
  }
}

/**
 * Send notifications for pending assignment (requires acceptance).
 * Sends email + in-app notification to member who must accept.
 * Notifies admins on email failure.
 *
 * @param request - Created asset request
 * @param asset - Asset being assigned
 * @param member - Member who must accept
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin who created the assignment
 */
async function sendPendingAssignmentNotifications(
  request: { id: string; requestNumber: string },
  asset: { assetTag: string | null; model: string; brand: string | null; type: string },
  member: MemberData,
  tenantId: string,
  adminId: string
): Promise<void> {
  try {
    const org = await getOrgDetails(tenantId);
    const admin = await getAdminDetails(adminId, tenantId);

    // Email notification
    if (member.email) {
      const emailData = assetAssignmentPendingEmail({
        requestNumber: request.requestNumber,
        assetTag: asset.assetTag || '',
        assetModel: asset.model,
        assetBrand: asset.brand || '',
        assetType: asset.type,
        userName: member.name || member.email,
        assignerName: admin.name || admin.email || 'Admin',
        orgSlug: org.slug,
        orgName: org.name,
        primaryColor: org.primaryColor || undefined,
      });

      try {
        await sendEmail({
          to: member.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        await notifyAdminsOfEmailFailure(tenantId, {
          action: 'assignment',
          assetTag: asset.assetTag || asset.model,
          memberName: member.name || member.email,
          memberEmail: member.email,
          emailSubject: emailData.subject,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
          metadata: { requestId: request.id, requestNumber: request.requestNumber },
        });
      }
    }

    // In-app notification
    await createNotification(
      NotificationTemplates.assetAssignmentPending(
        member.id,
        asset.assetTag || '',
        asset.model,
        admin.name || admin.email || 'Admin',
        request.requestNumber,
        request.id
      ),
      tenantId
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', requestId: request.id, assetTag: asset.assetTag }, 'Error sending pending assignment notifications');
  }
}

/**
 * Send unassignment notification for reassignment.
 * Notifies the previous assignee that their asset was reassigned.
 *
 * @param asset - Asset being reassigned
 * @param previousMember - Member losing the asset
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin performing the reassignment
 * @param reason - Reason for reassignment
 */
async function sendReassignmentUnassignNotification(
  asset: { id: string; assetTag: string | null; model: string; brand: string | null; type: string },
  previousMember: MemberData,
  tenantId: string,
  adminId: string,
  reason: string
): Promise<void> {
  try {
    logger.info({ assetId: asset.id, previousMemberId: previousMember.id, previousMemberEmail: previousMember.email, reason }, 'Starting reassignment notification to previous assignee');

    const org = await getOrgDetails(tenantId);
    const admin = await getAdminDetails(adminId, tenantId);

    // Send email notification
    const { assetUnassignedEmail } = await import('@/lib/core/asset-request-emails');
    const emailData = assetUnassignedEmail({
      assetTag: asset.assetTag || null,
      assetModel: asset.model,
      assetBrand: asset.brand || null,
      assetType: asset.type,
      userName: previousMember.name || previousMember.email,
      adminName: admin.name || admin.email || 'Admin',
      reason,
      orgSlug: org.slug,
      orgName: org.name,
      primaryColor: org.primaryColor || undefined,
    });

    logger.info({ to: previousMember.email, subject: emailData.subject }, 'Sending reassignment email to previous assignee');

    try {
      await sendEmail({
        to: previousMember.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      logger.info({ email: previousMember.email }, 'Reassignment email sent successfully');
    } catch (emailError) {
      logger.error({ error: emailError instanceof Error ? emailError.message : 'Unknown error', email: previousMember.email }, 'Failed to send reassignment email');
      await notifyAdminsOfEmailFailure(tenantId, {
        action: 'reassignment',
        assetTag: asset.assetTag || asset.model,
        memberName: previousMember.name || previousMember.email,
        memberEmail: previousMember.email,
        emailSubject: emailData.subject,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        metadata: { assetId: asset.id, reason },
      });
    }

    // In-app notification
    logger.info({ recipientId: previousMember.id, assetTag: asset.assetTag }, 'Creating in-app notification for reassignment');
    const notifResult = await createNotification(
      NotificationTemplates.assetUnassigned(
        previousMember.id,
        asset.assetTag || asset.model,
        asset.model,
        asset.id
      ),
      tenantId
    );
    logger.info({ success: notifResult, recipientId: previousMember.id }, 'Reassignment in-app notification result');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined, assetId: asset.id, previousMemberId: previousMember.id }, 'Error sending reassignment unassign notification');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: CHECK-IN (ASSIGN) BUSINESS LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Directly assign asset to member without acceptance workflow.
 * Used for users without login (canLogin=false) or when admin forces (skipAcceptance=true).
 *
 * Database operations:
 * - Updates asset: assignedMemberId, assignmentDate, status=IN_USE
 * - Creates AssetHistory entry
 *
 * @param asset - Asset to assign
 * @param member - Member receiving the asset
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin performing the assignment
 * @param notes - Optional notes
 * @param customAssignmentDate - Custom assignment date (optional)
 */
async function directAssign(
  asset: AssetData,
  member: MemberData,
  tenantId: string,
  adminId: string,
  notes: string | null,
  customAssignmentDate: string | null
): Promise<NextResponse> {
  const previousMember = asset.assignedMember;
  const assignmentDate = customAssignmentDate || new Date().toISOString().split('T')[0];

  // Transaction: Update asset + create history (all tenant-scoped)
  const updatedAsset = await prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({
      where: { id: asset.id },
      data: {
        assignedMemberId: member.id,
        assignmentDate,
        status: AssetStatus.IN_USE,
      },
      include: {
        assignedMember: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.assetHistory.create({
      data: {
        tenantId,
        assetId: asset.id,
        action: AssetHistoryAction.ASSIGNED,
        fromMemberId: previousMember?.id || null,
        toMemberId: member.id,
        fromStatus: asset.status,
        toStatus: AssetStatus.IN_USE,
        notes: notes || 'Asset assigned directly',
        performedById: adminId,
        assignmentDate: new Date(),
      },
    });

    return updated;
  });

  // Log activity
  await logAction(tenantId, adminId, ActivityActions.ASSET_ASSIGNED, 'Asset', updatedAsset.id, {
    assetModel: updatedAsset.model,
    assetType: updatedAsset.type,
    assetTag: updatedAsset.assetTag,
    previousMember: previousMember ? { id: previousMember.id, name: previousMember.name } : null,
    newMember: { id: member.id, name: member.name },
    directAssign: true,
  });

  // Send notifications (await to ensure completion on serverless)
  try {
    await sendAssignmentNotifications(updatedAsset, member, previousMember, tenantId);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', assetId: asset.id }, 'Error sending assignment notifications');
  }

  return NextResponse.json({
    success: true,
    type: 'direct_assignment',
    asset: updatedAsset,
    message: `Asset assigned to ${member.name || member.email}`,
  });
}

/**
 * Create pending assignment request for users with login.
 * User must accept via /api/asset-requests/[id]/accept before asset is assigned.
 *
 * Database operations:
 * - Creates AssetRequest with status=PENDING_USER_ACCEPTANCE
 * - Creates AssetRequestHistory entry
 *
 * @param asset - Asset to assign
 * @param member - Member who must accept
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin creating the assignment
 * @param notes - Optional notes
 * @param _customAssignmentDate - Reserved for future use (date applied when user accepts)
 */
async function createPendingAssignment(
  asset: AssetData,
  member: MemberData,
  tenantId: string,
  adminId: string,
  notes: string | null,
  _customAssignmentDate: string | null
): Promise<NextResponse> {
  // Transaction: Create request + history (all tenant-scoped)
  const assetRequest = await prisma.$transaction(async (tx) => {
    const requestNumber = await generateRequestNumber(tenantId, tx);

    const request = await tx.assetRequest.create({
      data: {
        tenantId,
        requestNumber,
        assetId: asset.id,
        memberId: member.id,
        type: AssetRequestType.ADMIN_ASSIGNMENT,
        status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
        reason: notes || 'This asset has been assigned to you. Please review and accept to confirm receipt.',
        assignedById: adminId,
      },
      include: {
        asset: { select: { id: true, assetTag: true, model: true, brand: true, type: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.assetRequestHistory.create({
      data: {
        assetRequestId: request.id,
        action: 'CREATED',
        oldStatus: null,
        newStatus: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
        notes: notes || 'Admin assignment created',
        performedById: adminId,
      },
    });

    return request;
  });

  // Log activity
  await logAction(tenantId, adminId, ActivityActions.ASSET_ASSIGNMENT_CREATED, 'AssetRequest', assetRequest.id, {
    requestNumber: assetRequest.requestNumber,
    assetTag: asset.assetTag,
    assetModel: asset.model,
    memberName: member.name || member.email,
  });

  // Send notifications (with admin fallback on failure)
  await sendPendingAssignmentNotifications(assetRequest, asset, member, tenantId, adminId);

  return NextResponse.json({
    success: true,
    type: 'pending_acceptance',
    request: assetRequest,
    message: `Assignment pending acceptance by ${member.name || member.email}`,
  });
}

/**
 * Unassign asset from current member as part of reassignment.
 * Called when admin reassigns from Person A to Person B.
 *
 * Database operations:
 * - Updates asset: assignedMemberId=null, status=SPARE
 * - Creates AssetHistory entry for unassignment
 *
 * @param asset - Asset being reassigned
 * @param previousMember - Current assignee (Person A)
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin performing the reassignment
 * @param reason - Reason for unassignment (e.g., "Reassigned to Person B")
 */
async function unassignForReassignment(
  asset: AssetData,
  previousMember: MemberData,
  tenantId: string,
  adminId: string,
  reason: string
): Promise<void> {
  // Transaction: Update asset + create history (all tenant-scoped)
  await prisma.$transaction(async (tx) => {
    await tx.asset.update({
      where: { id: asset.id },
      data: {
        assignedMemberId: null,
        assignmentDate: null,
        status: AssetStatus.SPARE,
      },
    });

    await tx.assetHistory.create({
      data: {
        tenantId,
        assetId: asset.id,
        action: AssetHistoryAction.UNASSIGNED,
        fromMemberId: previousMember.id,
        toMemberId: null,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.SPARE,
        notes: reason,
        performedById: adminId,
        returnDate: new Date(),
      },
    });
  });

  // Log activity
  await logAction(tenantId, adminId, ActivityActions.ASSET_ASSIGNED, 'Asset', asset.id, {
    action: 'unassigned_for_reassignment',
    assetModel: asset.model,
    assetType: asset.type,
    assetTag: asset.assetTag,
    previousMember: { id: previousMember.id, name: previousMember.name },
    reason,
  });

  // Send notification to previous member (await to ensure it completes before response on serverless)
  logger.info({ assetId: asset.id, previousMemberId: previousMember.id }, 'Calling sendReassignmentUnassignNotification');
  try {
    await sendReassignmentUnassignNotification(asset, previousMember, tenantId, adminId, reason);
    logger.info({ assetId: asset.id, previousMemberId: previousMember.id }, 'sendReassignmentUnassignNotification completed');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', assetId: asset.id, previousMemberId: previousMember.id }, 'Error in sendReassignmentUnassignNotification');
  }
}

/**
 * Main handler for asset assignment (check-in).
 * Orchestrates the assignment flow including reassignment.
 *
 * Flow:
 * 1. Validate target member exists in same tenant
 * 2. Check if already assigned to same member → Error
 * 3. Check if assigned to different member → Unassign first
 * 4. Check for pending requests (tenant-scoped)
 * 5. Route to directAssign or createPendingAssignment based on canLogin
 *
 * @param asset - Current asset state
 * @param assignedMemberId - Target member ID
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin performing the assignment
 * @param notes - Optional notes
 * @param skipAcceptance - Force direct assign
 * @param assignmentDate - Custom assignment date (optional)
 */
async function handleAssign(
  asset: AssetData,
  assignedMemberId: string,
  tenantId: string,
  adminId: string,
  notes: string | null,
  skipAcceptance: boolean,
  assignmentDate: string | null
): Promise<NextResponse> {
  // STEP 1: Verify member exists in same tenant
  const member = await prisma.teamMember.findFirst({
    where: { id: assignedMemberId, tenantId },
    select: { id: true, name: true, email: true, canLogin: true },
  });

  if (!member) {
    return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
  }

  // STEP 2: Check if already assigned to same member
  if (asset.assignedMemberId === assignedMemberId) {
    return NextResponse.json({ error: 'Asset is already assigned to this member' }, { status: 400 });
  }

  // STEP 3: Handle reassignment - unassign from current member first
  if (asset.assignedMemberId && asset.assignedMember) {
    logger.info({ assetId: asset.id, previousMemberId: asset.assignedMemberId, newMemberId: assignedMemberId }, 'Reassigning asset - will unassign from previous member first');
    await unassignForReassignment(
      asset,
      asset.assignedMember,
      tenantId,
      adminId,
      `Reassigned to ${member.name || member.email}`
    );
  }

  // STEP 4: Check for pending requests (TENANT-SCOPED - critical for security)
  const pendingRequest = await prisma.assetRequest.findFirst({
    where: {
      assetId: asset.id,
      tenantId, // Critical: tenant isolation
      status: {
        in: [AssetRequestStatus.PENDING_ADMIN_APPROVAL, AssetRequestStatus.PENDING_USER_ACCEPTANCE],
      },
    },
  });

  if (pendingRequest) {
    return NextResponse.json({ error: 'Asset has a pending request' }, { status: 400 });
  }

  // STEP 5: Determine assignment type and execute
  const requiresAcceptance = member.canLogin && !skipAcceptance;

  // Refresh asset state after potential unassignment
  const refreshedAsset: AssetData = {
    ...asset,
    status: AssetStatus.SPARE,
    assignedMemberId: null,
    assignedMember: null,
  };

  if (requiresAcceptance) {
    return createPendingAssignment(refreshedAsset, member, tenantId, adminId, notes, assignmentDate);
  } else {
    return directAssign(refreshedAsset, member, tenantId, adminId, notes, assignmentDate);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: CHECK-OUT (UNASSIGN) BUSINESS LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Directly unassign asset from member.
 * Used when admin removes assignment without requiring approval.
 *
 * Database operations:
 * - Updates asset: assignedMemberId=null, status=SPARE
 * - Creates AssetHistory entry
 *
 * @param asset - Asset to unassign
 * @param previousMember - Member losing the asset
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin performing the unassignment
 * @param notes - Optional notes
 */
async function directUnassign(
  asset: AssetData,
  previousMember: MemberData,
  tenantId: string,
  adminId: string,
  notes: string | null
): Promise<NextResponse> {
  // Transaction: Update asset + create history (all tenant-scoped)
  const updatedAsset = await prisma.$transaction(async (tx) => {
    const updated = await tx.asset.update({
      where: { id: asset.id },
      data: {
        assignedMemberId: null,
        assignmentDate: null,
        status: AssetStatus.SPARE,
      },
    });

    await tx.assetHistory.create({
      data: {
        tenantId,
        assetId: asset.id,
        action: AssetHistoryAction.UNASSIGNED,
        fromMemberId: previousMember.id,
        toMemberId: null,
        fromStatus: asset.status,
        toStatus: AssetStatus.SPARE,
        notes: notes || 'Asset unassigned',
        performedById: adminId,
        returnDate: new Date(),
      },
    });

    return updated;
  });

  // Log activity
  await logAction(tenantId, adminId, ActivityActions.ASSET_ASSIGNED, 'Asset', updatedAsset.id, {
    action: 'unassigned',
    assetModel: updatedAsset.model,
    assetType: updatedAsset.type,
    assetTag: updatedAsset.assetTag,
    previousMember: { id: previousMember.id, name: previousMember.name },
    directUnassign: true,
  });

  // Send email and in-app notifications (non-blocking)
  try {
    logger.info({ assetId: updatedAsset.id, previousMemberId: previousMember.id, previousMemberEmail: previousMember.email }, 'Starting unassignment notifications');

    const org = await getOrgDetails(tenantId);
    const admin = await getAdminDetails(adminId, tenantId);

    // Send email notification
    const { assetUnassignedEmail } = await import('@/lib/core/asset-request-emails');
    const emailData = assetUnassignedEmail({
      assetTag: updatedAsset.assetTag || null,
      assetModel: updatedAsset.model,
      assetBrand: updatedAsset.brand || null,
      assetType: updatedAsset.type,
      userName: previousMember.name || previousMember.email,
      adminName: admin.name || admin.email || 'Admin',
      reason: notes || undefined,
      orgSlug: org.slug,
      orgName: org.name,
      primaryColor: org.primaryColor || undefined,
    });

    logger.info({ to: previousMember.email, subject: emailData.subject }, 'Sending unassignment email');

    await sendEmail({
      to: previousMember.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    }).catch((emailError) => {
      logger.error({ error: emailError instanceof Error ? emailError.message : 'Unknown error', email: previousMember.email }, 'Failed to send unassignment email');
      notifyAdminsOfEmailFailure(tenantId, {
        action: 'unassignment',
        assetTag: updatedAsset.assetTag || updatedAsset.model,
        memberName: previousMember.name || previousMember.email,
        memberEmail: previousMember.email,
        emailSubject: emailData.subject,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        metadata: { assetId: updatedAsset.id },
      });
    });

    // In-app notification
    logger.info({ recipientId: previousMember.id, assetTag: updatedAsset.assetTag }, 'Creating in-app notification for unassignment');
    const notifResult = await createNotification(
      NotificationTemplates.assetUnassigned(previousMember.id, updatedAsset.assetTag || '', updatedAsset.model, updatedAsset.id),
      tenantId
    );
    logger.info({ success: notifResult, recipientId: previousMember.id }, 'In-app notification result');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined, assetId: asset.id, previousMemberId: previousMember.id }, 'Error sending unassign notifications');
  }

  return NextResponse.json({
    success: true,
    type: 'direct_unassignment',
    asset: updatedAsset,
    message: `Asset unassigned from ${previousMember.name || previousMember.email}`,
  });
}

/**
 * Create pending return request that requires admin approval.
 * Used when admin wants to create a formal return record.
 *
 * Database operations:
 * - Creates AssetRequest with status=PENDING_RETURN_APPROVAL
 * - Creates AssetRequestHistory entry
 *
 * @param asset - Asset to return
 * @param member - Current assignee
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin creating the return request
 * @param notes - Optional notes
 */
async function createPendingReturnRequest(
  asset: AssetData,
  member: MemberData,
  tenantId: string,
  adminId: string,
  notes: string | null
): Promise<NextResponse> {
  // Transaction: Create request + history (all tenant-scoped)
  const assetRequest = await prisma.$transaction(async (tx) => {
    const requestNumber = await generateRequestNumber(tenantId, tx);

    const request = await tx.assetRequest.create({
      data: {
        tenantId,
        requestNumber,
        assetId: asset.id,
        memberId: member.id,
        type: AssetRequestType.RETURN_REQUEST,
        status: AssetRequestStatus.PENDING_RETURN_APPROVAL,
        reason: notes || 'Asset return has been initiated. Pending approval.',
        assignedById: adminId,
      },
      include: {
        asset: { select: { id: true, assetTag: true, model: true, brand: true, type: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });

    await tx.assetRequestHistory.create({
      data: {
        assetRequestId: request.id,
        action: 'CREATED',
        oldStatus: null,
        newStatus: AssetRequestStatus.PENDING_RETURN_APPROVAL,
        notes: notes || 'Return request created',
        performedById: adminId,
      },
    });

    return request;
  });

  // Log activity
  await logAction(tenantId, adminId, ActivityActions.ASSET_RETURN_REQUESTED, 'AssetRequest', assetRequest.id, {
    requestNumber: assetRequest.requestNumber,
    assetTag: asset.assetTag,
    assetModel: asset.model,
    memberName: member.name || member.email,
  });

  return NextResponse.json({
    success: true,
    type: 'pending_return_approval',
    request: assetRequest,
    message: `Return request created for ${asset.assetTag || asset.model}`,
  });
}

/**
 * Main handler for asset unassignment (check-out).
 * Routes to direct unassign or pending return request.
 *
 * @param asset - Current asset state
 * @param tenantId - Tenant ID for isolation
 * @param adminId - Admin performing the unassignment
 * @param notes - Optional notes
 * @param createReturnRequest - Whether to create formal return request
 */
async function handleUnassign(
  asset: AssetData,
  tenantId: string,
  adminId: string,
  notes: string | null,
  createReturnRequest: boolean
): Promise<NextResponse> {
  // Validate: Asset must be assigned to unassign
  if (!asset.assignedMemberId || !asset.assignedMember) {
    return NextResponse.json({ error: 'Asset is not currently assigned' }, { status: 400 });
  }

  const previousMember = asset.assignedMember;

  if (createReturnRequest) {
    return createPendingReturnRequest(asset, previousMember, tenantId, adminId, notes);
  } else {
    return directUnassign(asset, previousMember, tenantId, adminId, notes);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: MAIN ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/assets/[id]/assign
 *
 * Assign or unassign an asset with conditional acceptance workflow.
 *
 * @route POST /api/assets/[id]/assign
 * @access Admin only
 * @module assets
 *
 * @param {string} id - Asset ID (path parameter)
 * @body {string|null} assignedMemberId - Member ID to assign (null to unassign)
 * @body {string} [notes] - Optional notes
 * @body {boolean} [skipAcceptance=false] - Skip user acceptance (admin override)
 * @body {boolean} [createReturnRequest=false] - Create return request for unassign
 *
 * @returns {Object} Updated asset or created request
 *
 * @example Assign to user without login (direct):
 * { "assignedMemberId": "member-456" }
 *
 * @example Assign to user with login (pending acceptance):
 * { "assignedMemberId": "member-789" }
 *
 * @example Force direct assign:
 * { "assignedMemberId": "member-789", "skipAcceptance": true }
 *
 * @example Direct unassign:
 * { "assignedMemberId": null }
 *
 * @example Create return request:
 * { "assignedMemberId": null, "createReturnRequest": true }
 */
async function assignAssetHandler(request: NextRequest, context: APIContext): Promise<NextResponse> {
  // Get tenant context from context (provided by withErrorHandler)
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const adminId = tenant.userId;

  // Validate path parameter
  const assetId = context.params?.id;
  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = assignAssetSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { assignedMemberId, notes, skipAcceptance, createReturnRequest, assignmentDate } = validation.data;

  // Get current asset state (TENANT-SCOPED - critical for security)
  const currentAsset = await db.asset.findFirst({
    where: { id: assetId },
    include: {
      assignedMember: { select: { id: true, name: true, email: true, canLogin: true } },
    },
  });

  if (!currentAsset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Route to appropriate handler based on operation
  if (assignedMemberId === null) {
    // CHECK-OUT: Unassign asset
    return handleUnassign(currentAsset, tenantId, adminId, notes || null, createReturnRequest);
  } else {
    // CHECK-IN: Assign asset
    return handleAssign(currentAsset, assignedMemberId, tenantId, adminId, notes || null, skipAcceptance, assignmentDate || null);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandler(assignAssetHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});
