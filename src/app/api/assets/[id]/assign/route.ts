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
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import {
  AssetStatus,
  AssetRequestStatus,
  AssetRequestType,
  AssetHistoryAction,
  TeamMemberRole,
  NotificationType,
} from '@prisma/client';
import { z } from 'zod';
import { logAction, ActivityActions } from '@/lib/activity';
import { sendEmail } from '@/lib/email';
import { assetAssignmentEmail, assetAssignmentPendingEmail } from '@/lib/email-templates';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/lib/domains/system/notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { generateRequestNumber } from '@/lib/domains/operations/asset-requests/asset-request-utils';

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
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Notify all admins when email notification fails.
 * Creates in-app notification for each admin in the tenant.
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
    error: string;
  }
): Promise<void> {
  try {
    // Get all admins in tenant
    const admins = await prisma.teamMember.findMany({
      where: { tenantId, role: TeamMemberRole.ADMIN },
      select: { id: true },
    });

    const notifications = admins.map((admin) => ({
      recipientId: admin.id,
      title: 'Email Notification Failed',
      message: `Failed to send ${context.action} email for asset ${context.assetTag} to ${context.memberName}. Error: ${context.error}`,
      type: 'GENERAL' as NotificationType,
    }));

    await createBulkNotifications(notifications, tenantId);
  } catch {
    console.error('[notifyAdminsOfEmailFailure] Failed to notify admins');
  }
}

/**
 * Get organization details for email templates.
 * Tenant-scoped query.
 */
async function getOrgDetails(tenantId: string): Promise<{ slug: string; name: string }> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { slug: true, name: true },
  });
  return { slug: org?.slug || 'app', name: org?.name || 'Durj' };
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
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
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
    console.error('[sendAssignmentNotifications] Error:', error);
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
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
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
    console.error('[sendPendingAssignmentNotifications] Error:', error);
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
    const org = await getOrgDetails(tenantId);
    const admin = await getAdminDetails(adminId, tenantId);

    // Send email notification
    const { assetUnassignedEmail } = await import('@/lib/email-templates');
    const emailData = assetUnassignedEmail({
      assetTag: asset.assetTag || '',
      assetModel: asset.model,
      assetBrand: asset.brand || '',
      assetType: asset.type,
      userName: previousMember.name || previousMember.email,
      adminName: admin.name || admin.email || 'Admin',
      reason,
      orgSlug: org.slug,
      orgName: org.name,
    });

    try {
      await sendEmail({
        to: previousMember.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
    } catch (emailError) {
      await notifyAdminsOfEmailFailure(tenantId, {
        action: 'reassignment',
        assetTag: asset.assetTag || asset.model,
        memberName: previousMember.name || previousMember.email,
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
      });
    }

    // In-app notification
    await createNotification(
      NotificationTemplates.assetUnassigned(
        previousMember.id,
        asset.assetTag || asset.model,
        asset.model,
        asset.id
      ),
      tenantId
    );
  } catch (error) {
    console.error('[sendReassignmentUnassignNotification] Error:', error);
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
 */
async function directAssign(
  asset: AssetData,
  member: MemberData,
  tenantId: string,
  adminId: string,
  notes: string | null
): Promise<NextResponse> {
  const previousMember = asset.assignedMember;
  const assignmentDate = new Date().toISOString().split('T')[0];

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
        notes: notes || 'Direct assignment by admin',
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

  // Send notifications (non-blocking)
  sendAssignmentNotifications(updatedAsset, member, previousMember, tenantId).catch(() => {});

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
 */
async function createPendingAssignment(
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
        type: AssetRequestType.ADMIN_ASSIGNMENT,
        status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
        reason: notes || 'Asset assigned by admin',
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

  // Send notification to previous member (non-blocking)
  sendReassignmentUnassignNotification(asset, previousMember, tenantId, adminId, reason).catch(() => {});
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
 */
async function handleAssign(
  asset: AssetData,
  assignedMemberId: string,
  tenantId: string,
  adminId: string,
  notes: string | null,
  skipAcceptance: boolean
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
    return createPendingAssignment(refreshedAsset, member, tenantId, adminId, notes);
  } else {
    return directAssign(refreshedAsset, member, tenantId, adminId, notes);
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
        notes: notes || 'Direct unassignment by admin',
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

  // Notify previous assignee (non-blocking)
  createNotification(
    NotificationTemplates.assetUnassigned(previousMember.id, updatedAsset.assetTag || '', updatedAsset.model, updatedAsset.id),
    tenantId
  ).catch(() => {});

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
        reason: notes || 'Return initiated by admin',
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
        notes: notes || 'Return request created by admin',
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
  // Get tenant context from session
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const adminId = session.user.id;

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

  const { assignedMemberId, notes, skipAcceptance, createReturnRequest } = validation.data;

  // Get current asset state (TENANT-SCOPED - critical for security)
  const currentAsset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
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
    return handleAssign(currentAsset, assignedMemberId, tenantId, adminId, notes || null, skipAcceptance);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandler(assignAssetHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});
