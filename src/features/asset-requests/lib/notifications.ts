/**
 * @file asset-request-notifications.ts
 * @description Asset request notification utilities - email and in-app notifications
 * @module domains/operations/asset-requests
 *
 * PURPOSE:
 * Provides reusable functions for sending notifications when asset requests are created.
 * Handles different notification flows based on request type (employee, admin, return).
 *
 * NOTIFICATION FLOWS:
 * - EMPLOYEE_REQUEST: Notify admins/approvers about new asset request
 * - ADMIN_ASSIGNMENT: Notify user about pending asset assignment
 * - RETURN_REQUEST: Notify admins about return request
 */

import { AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { sendEmail, sendBatchEmails } from '@/lib/core/email';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/features/notifications/lib';
import {
  assetRequestSubmittedEmail,
  assetAssignmentPendingEmail,
  assetReturnRequestEmail,
} from '@/lib/core/asset-request-emails';
import { findApplicablePolicy, initializeApprovalChain } from '@/features/approvals/lib';
import { notifyApproversViaWhatsApp } from '@/lib/whatsapp';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssetRequestNotificationParams {
  tenantId: string;
  currentUserId: string;
  assetRequest: {
    id: string;
    requestNumber: string;
    asset: {
      id: string;
      assetTag: string | null;
      model: string;
      brand: string | null;
      type: string;
    };
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  asset: {
    assetTag: string | null;
    model: string;
    brand: string | null;
  };
  type: AssetRequestType;
  reason: string | null;
  notes: string | null;
  targetUserId: string;
}

interface OrgInfo {
  slug: string;
  name: string;
  primaryColor: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get organization info and current user name for notifications
 */
async function getNotificationContext(
  tenantId: string,
  currentUserId: string
): Promise<{ org: OrgInfo; currentUserName: string }> {
  const [org, currentMember] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, primaryColor: true },
    }),
    prisma.teamMember.findUnique({
      where: { id: currentUserId },
      select: { name: true, email: true },
    }),
  ]);

  return {
    org: {
      slug: org?.slug || 'app',
      name: org?.name || 'Durj',
      primaryColor: org?.primaryColor || null,
    },
    currentUserName: currentMember?.name || currentMember?.email || 'Admin',
  };
}

/**
 * Get tenant-scoped admins for notifications
 */
async function getTenantAdmins(tenantId: string): Promise<Array<{ id: string; email: string }>> {
  return prisma.teamMember.findMany({
    where: {
      tenantId,
      isAdmin: true,
      isDeleted: false,
    },
    select: { id: true, email: true },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION HANDLERS BY REQUEST TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send notifications for employee asset request
 * Checks for approval policy and notifies appropriate approvers
 */
async function sendEmployeeRequestNotifications(
  params: AssetRequestNotificationParams,
  org: OrgInfo
): Promise<void> {
  const { tenantId, assetRequest, asset, reason } = params;

  // Get asset price for multi-level approval check
  const assetWithPrice = await prisma.asset.findFirst({
    where: { id: assetRequest.asset.id, tenantId },
    select: { priceQAR: true },
  });
  const assetValue = assetWithPrice?.priceQAR ? Number(assetWithPrice.priceQAR) : 0;

  // Check for multi-level approval policy
  const approvalPolicy = await findApplicablePolicy('ASSET_REQUEST', { amount: assetValue, tenantId });

  if (approvalPolicy && approvalPolicy.levels.length > 0) {
    // Initialize approval chain (pass requester ID to check manager relationship)
    const steps = await initializeApprovalChain('ASSET_REQUEST', assetRequest.id, approvalPolicy, tenantId, assetRequest.user.id);

    // Send WhatsApp notifications to approvers (non-blocking)
    if (steps.length > 0) {
      notifyApproversViaWhatsApp(
        tenantId,
        'ASSET_REQUEST',
        assetRequest.id,
        steps[0].requiredRole,
        assetRequest.user.id // Pass requester ID for role-based routing
      );
    }

    // Notify users with the first level's required role
    const firstStep = steps[0];
    if (firstStep) {
      // Note: isAdmin grants full admin access, canApprove allows approving direct reports
      const approvers = await prisma.teamMember.findMany({
        where: {
          tenantId,
          isAdmin: true, // For now, use admins for all approver roles
          isDeleted: false,
        },
        select: { id: true, email: true },
      });

      // Send email to approvers
      const emailData = assetRequestSubmittedEmail({
        requestNumber: assetRequest.requestNumber,
        assetTag: asset.assetTag,
        assetModel: asset.model,
        assetBrand: asset.brand,
        assetType: assetRequest.asset.type,
        requesterName: assetRequest.user.name || assetRequest.user.email,
        requesterEmail: assetRequest.user.email,
        reason: reason || '',
        orgSlug: org.slug,
        orgName: org.name,
        primaryColor: org.primaryColor || undefined,
      });
      await sendBatchEmails(approvers.map(a => ({
        to: a.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      })));

      // In-app notifications
      for (const approver of approvers) {
        await createNotification({
          recipientId: approver.id,
          type: 'APPROVAL_PENDING',
          title: 'Asset Request Approval Required',
          message: `${assetRequest.user.name || assetRequest.user.email} requested asset ${asset.model} (${asset.assetTag || 'N/A'}). Your approval is required.`,
          link: `/admin/asset-requests/${assetRequest.id}`,
          entityType: 'AssetRequest',
          entityId: assetRequest.id,
        }, tenantId);
      }
    }
  } else {
    // No policy - fall back to notifying all admins
    // Send WhatsApp notifications (non-blocking)
    notifyApproversViaWhatsApp(
      tenantId,
      'ASSET_REQUEST',
      assetRequest.id,
      'MANAGER',
      assetRequest.user.id // Pass requester ID for role-based routing
    );

    const admins = await getTenantAdmins(tenantId);

    const emailData = assetRequestSubmittedEmail({
      requestNumber: assetRequest.requestNumber,
      assetTag: asset.assetTag,
      assetModel: asset.model,
      assetBrand: asset.brand,
      assetType: assetRequest.asset.type,
      requesterName: assetRequest.user.name || assetRequest.user.email,
      requesterEmail: assetRequest.user.email,
      reason: reason || '',
      orgSlug: org.slug,
      orgName: org.name,
      primaryColor: org.primaryColor || undefined,
    });
    await sendBatchEmails(admins.map(a => ({
      to: a.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    })));

    // In-app notifications
    const notifications = admins.map(admin =>
      NotificationTemplates.assetRequestSubmitted(
        admin.id,
        assetRequest.user.name || assetRequest.user.email,
        asset.assetTag || '',
        asset.model,
        assetRequest.requestNumber,
        assetRequest.id
      )
    );
    await createBulkNotifications(notifications, tenantId);
  }
}

/**
 * Send notifications for admin asset assignment
 * Notifies user about pending assignment they need to accept
 */
async function sendAdminAssignmentNotifications(
  params: AssetRequestNotificationParams,
  org: OrgInfo,
  currentUserName: string
): Promise<void> {
  const { tenantId, assetRequest, asset, notes, targetUserId } = params;

  const emailData = assetAssignmentPendingEmail({
    requestNumber: assetRequest.requestNumber,
    assetTag: asset.assetTag,
    assetModel: asset.model,
    assetBrand: asset.brand,
    assetType: assetRequest.asset.type,
    userName: assetRequest.user.name || assetRequest.user.email,
    assignerName: currentUserName,
    reason: notes || undefined,
    orgSlug: org.slug,
    orgName: org.name,
    primaryColor: org.primaryColor || undefined,
  });
  await sendEmail({
    to: assetRequest.user.email,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });

  // In-app notification
  await createNotification(
    NotificationTemplates.assetAssignmentPending(
      targetUserId,
      asset.assetTag || '',
      asset.model,
      currentUserName,
      assetRequest.requestNumber,
      assetRequest.id
    ),
    tenantId
  );
}

/**
 * Send notifications for return request
 * Notifies admins about user wanting to return an asset
 */
async function sendReturnRequestNotifications(
  params: AssetRequestNotificationParams,
  org: OrgInfo
): Promise<void> {
  const { tenantId, assetRequest, asset, reason } = params;

  const admins = await getTenantAdmins(tenantId);

  const emailData = assetReturnRequestEmail({
    requestNumber: assetRequest.requestNumber,
    assetTag: asset.assetTag,
    assetModel: asset.model,
    assetBrand: asset.brand,
    assetType: assetRequest.asset.type,
    userName: assetRequest.user.name || assetRequest.user.email,
    userEmail: assetRequest.user.email,
    reason: reason || '',
    orgSlug: org.slug,
    orgName: org.name,
    primaryColor: org.primaryColor || undefined,
  });
  await sendBatchEmails(admins.map(a => ({
    to: a.email,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  })));

  // In-app notifications
  const notifications = admins.map(admin =>
    NotificationTemplates.assetReturnSubmitted(
      admin.id,
      assetRequest.user.name || assetRequest.user.email,
      asset.assetTag || '',
      asset.model,
      assetRequest.requestNumber,
      assetRequest.id
    )
  );
  await createBulkNotifications(notifications, tenantId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send notifications for a newly created asset request
 * Routes to appropriate handler based on request type
 *
 * @param params - Notification parameters including request type and details
 *
 * @example
 * await sendAssetRequestNotifications({
 *   tenantId: 'org_123',
 *   currentUserId: 'user_456',
 *   assetRequest: { id, requestNumber, asset, user },
 *   asset: { assetTag, model, brand },
 *   type: AssetRequestType.EMPLOYEE_REQUEST,
 *   reason: 'Need for project work',
 *   notes: null,
 *   targetUserId: 'user_456',
 * });
 */
export async function sendAssetRequestNotifications(
  params: AssetRequestNotificationParams
): Promise<void> {
  const { tenantId, currentUserId, type } = params;

  // Get org and user info for notifications
  const { org, currentUserName } = await getNotificationContext(tenantId, currentUserId);

  // Route to appropriate notification handler
  switch (type) {
    case AssetRequestType.EMPLOYEE_REQUEST:
      await sendEmployeeRequestNotifications(params, org);
      break;

    case AssetRequestType.ADMIN_ASSIGNMENT:
      await sendAdminAssignmentNotifications(params, org, currentUserName);
      break;

    case AssetRequestType.RETURN_REQUEST:
      await sendReturnRequestNotifications(params, org);
      break;
  }
}
