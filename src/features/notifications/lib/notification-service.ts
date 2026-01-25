/**
 * @file notification-service.ts
 * @description Core notification service for creating in-app notifications. Provides functions
 *              for single and bulk notification creation, plus pre-built templates for common
 *              scenarios like leave requests, asset assignments, and purchase requests.
 * @module domains/system/notifications
 */

import { prisma } from '@/lib/core/prisma';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Creates a single notification for a user.
 * Non-blocking: failures are logged but don't break operations.
 * @param input - The notification input data
 * @param tenantId - Required tenant ID for multi-tenancy isolation
 */
export async function createNotification(
  input: CreateNotificationInput,
  tenantId: string
): Promise<boolean> {
  if (!tenantId) {
    console.error('createNotification called without tenantId - this is a multi-tenancy violation');
    return false;
  }
  try {
    await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
        tenantId,
      },
    });
    return true;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw - notifications should not break main operations
    return false;
  }
}

/**
 * Creates notifications for multiple recipients.
 * Non-blocking: failures are logged but don't break operations.
 * @param inputs - Array of notification input data
 * @param tenantId - Required tenant ID for multi-tenancy isolation
 */
export async function createBulkNotifications(
  inputs: CreateNotificationInput[],
  tenantId: string
): Promise<number> {
  if (!tenantId) {
    console.error('createBulkNotifications called without tenantId - this is a multi-tenancy violation');
    return 0;
  }
  try {
    const result = await prisma.notification.createMany({
      data: inputs.map((input) => ({
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        entityType: input.entityType,
        entityId: input.entityId,
        tenantId,
      })),
    });
    return result.count;
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
    return 0;
  }
}

/**
 * Admin notification input structure.
 */
export interface NotifyAdminsInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  /** Member ID to exclude from notifications (typically the actor who triggered the action) */
  excludeMemberId?: string;
}

/**
 * Send notifications to all admin users in a tenant.
 * Non-blocking: failures are logged but don't break operations.
 *
 * @param db - Prisma client (tenant-scoped or global)
 * @param tenantId - Required tenant ID for multi-tenancy isolation
 * @param input - Notification details
 * @returns Number of notifications sent
 *
 * @example
 * ```typescript
 * // Notify all admins about a new leave request (excluding the requester)
 * await notifyAdmins(prisma, tenantId, {
 *   type: 'LEAVE_REQUEST_SUBMITTED',
 *   title: 'New Leave Request',
 *   message: `${requesterName} submitted a ${leaveType} request for ${totalDays} days.`,
 *   link: `/admin/leave/requests/${requestId}`,
 *   entityType: 'LeaveRequest',
 *   entityId: requestId,
 *   excludeMemberId: requesterId, // Don't notify the requester
 * });
 * ```
 */
export async function notifyAdmins(
  db: typeof prisma,
  tenantId: string,
  input: NotifyAdminsInput
): Promise<number> {
  if (!tenantId) {
    console.error('notifyAdmins called without tenantId - this is a multi-tenancy violation');
    return 0;
  }

  try {
    // Get all admin team members for this tenant
    const admins = await db.teamMember.findMany({
      where: {
        tenantId,
        isAdmin: true,
        isDeleted: false,
        ...(input.excludeMemberId ? { NOT: { id: input.excludeMemberId } } : {}),
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      return 0;
    }

    // Create notifications for all admins
    const notifications: CreateNotificationInput[] = admins.map((admin) => ({
      recipientId: admin.id,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      entityType: input.entityType,
      entityId: input.entityId,
    }));

    return await createBulkNotifications(notifications, tenantId);
  } catch (error) {
    console.error('Failed to notify admins:', error);
    return 0;
  }
}

/**
 * Get all admin member IDs for a tenant.
 * Useful when you need both the IDs and to perform additional operations.
 *
 * @param db - Prisma client
 * @param tenantId - Tenant ID
 * @param excludeMemberId - Optional member ID to exclude
 * @returns Array of admin member records with id and email
 */
export async function getAdminMembers(
  db: typeof prisma,
  tenantId: string,
  excludeMemberId?: string
): Promise<{ id: string; email: string }[]> {
  if (!tenantId) {
    return [];
  }

  try {
    return await db.teamMember.findMany({
      where: {
        tenantId,
        isAdmin: true,
        isDeleted: false,
        ...(excludeMemberId ? { NOT: { id: excludeMemberId } } : {}),
      },
      select: { id: true, email: true },
    });
  } catch (error) {
    console.error('Failed to get admin members:', error);
    return [];
  }
}

/**
 * Helper templates for common notification scenarios.
 * Returns the input object for createNotification().
 */
export const NotificationTemplates = {
  // Leave Management
  leaveSubmitted: (
    adminMemberId: string,
    requesterName: string,
    requestNumber: string,
    leaveType: string,
    totalDays: number,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'LEAVE_REQUEST_SUBMITTED',
    title: 'New Leave Request',
    message: `${requesterName} submitted a ${leaveType} request (${requestNumber}) for ${totalDays} day${totalDays === 1 ? '' : 's'}.`,
    link: `/admin/leave/requests/${entityId}`,
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveApproved: (
    memberId: string,
    requestNumber: string,
    leaveType: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'LEAVE_REQUEST_APPROVED',
    title: 'Leave Request Approved',
    message: `Your ${leaveType} request (${requestNumber}) has been approved.`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveRejected: (
    memberId: string,
    requestNumber: string,
    leaveType: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'LEAVE_REQUEST_REJECTED',
    title: 'Leave Request Rejected',
    message: `Your ${leaveType} request (${requestNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveCancelled: (
    memberId: string,
    requestNumber: string,
    leaveType: string,
    cancelledByAdmin: boolean,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'LEAVE_REQUEST_CANCELLED',
    title: 'Leave Request Cancelled',
    message: cancelledByAdmin
      ? `Your ${leaveType} request (${requestNumber}) was cancelled by admin.${reason ? ` Reason: ${reason}` : ''}`
      : `Your ${leaveType} request (${requestNumber}) has been cancelled.`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  // Asset Management
  assetAssigned: (
    memberId: string,
    assetTag: string,
    assetModel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'ASSET_ASSIGNED',
    title: 'Asset Assigned',
    message: `${assetModel} (${assetTag}) has been assigned to you.`,
    link: '/employee/my-assets',
    entityType: 'Asset',
    entityId,
  }),

  assetUnassigned: (
    memberId: string,
    assetTag: string,
    assetModel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'ASSET_UNASSIGNED',
    title: 'Asset Returned',
    message: `${assetModel} (${assetTag}) has been unassigned from you.`,
    link: '/employee/my-assets',
    entityType: 'Asset',
    entityId,
  }),

  // Asset Requests
  assetRequestSubmitted: (
    adminMemberId: string,
    requesterName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'ASSET_REQUEST_SUBMITTED',
    title: 'New Asset Request',
    message: `${requesterName} requested asset ${assetModel} (${assetTag}) - ${requestNumber}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetReturnSubmitted: (
    adminMemberId: string,
    requesterName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'ASSET_RETURN_SUBMITTED',
    title: 'Asset Return Request',
    message: `${requesterName} wants to return ${assetModel} (${assetTag}) - ${requestNumber}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetAssignmentPending: (
    memberId: string,
    assetTag: string,
    assetModel: string,
    assignerName: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'ASSET_ASSIGNMENT_PENDING',
    title: 'Asset Assignment Pending',
    message: `${assignerName} wants to assign ${assetModel} (${assetTag}) to you. Please accept or decline.`,
    link: `/employee/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetAssignmentAccepted: (
    adminMemberId: string,
    memberName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'ASSET_ASSIGNMENT_ACCEPTED',
    title: 'Asset Assignment Accepted',
    message: `${memberName} accepted the assignment of ${assetModel} (${assetTag}) - ${requestNumber}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetAssignmentDeclined: (
    adminMemberId: string,
    memberName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'ASSET_ASSIGNMENT_DECLINED',
    title: 'Asset Assignment Declined',
    message: `${memberName} declined the assignment of ${assetModel} (${assetTag}) - ${requestNumber}${reason ? `. Reason: ${reason}` : ''}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetRequestApproved: (
    memberId: string,
    assetTag: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'ASSET_REQUEST_APPROVED',
    title: 'Asset Request Approved',
    message: `Your request for asset ${assetTag} (${requestNumber}) has been approved.`,
    link: '/employee/asset-requests',
    entityType: 'AssetRequest',
    entityId,
  }),

  assetRequestRejected: (
    memberId: string,
    assetTag: string,
    requestNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'ASSET_REQUEST_REJECTED',
    title: 'Asset Request Rejected',
    message: `Your request for asset ${assetTag} (${requestNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/employee/asset-requests',
    entityType: 'AssetRequest',
    entityId,
  }),

  // Spend Requests
  purchaseRequestSubmitted: (
    adminMemberId: string,
    referenceNumber: string,
    requesterName: string,
    title: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'PURCHASE_REQUEST_SUBMITTED',
    title: 'New Spend Request',
    message: `${requesterName} submitted a spend request (${referenceNumber}): ${title}`,
    link: `/admin/purchase-requests/${entityId}`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  purchaseRequestApproved: (
    memberId: string,
    referenceNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'PURCHASE_REQUEST_APPROVED',
    title: 'Spend Request Approved',
    message: `Your spend request (${referenceNumber}) has been approved.`,
    link: `/employee/purchase-requests`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  purchaseRequestRejected: (
    memberId: string,
    referenceNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'PURCHASE_REQUEST_REJECTED',
    title: 'Spend Request Rejected',
    message: `Your spend request (${referenceNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: `/employee/purchase-requests`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  // Document Expiry Warnings
  documentExpiryWarning: (
    memberId: string,
    documentType: string,
    daysUntilExpiry: number
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'DOCUMENT_EXPIRY_WARNING',
    title: 'Document Expiring Soon',
    message: `Your ${documentType} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew it.`,
    link: '/profile',
    entityType: 'HRProfile',
  }),

  // General notification
  general: (
    memberId: string,
    title: string,
    message: string,
    link?: string
  ): CreateNotificationInput => ({
    recipientId: memberId,
    type: 'GENERAL',
    title,
    message,
    link,
  }),

  // Supplier Management
  supplierApproved: (
    adminMemberId: string,
    supplierName: string,
    suppCode: string | null,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'SUPPLIER_APPROVED',
    title: 'Supplier Approved',
    message: suppCode
      ? `Supplier ${supplierName} (${suppCode}) has been approved.`
      : `Supplier ${supplierName} has been approved.`,
    link: `/admin/suppliers/${entityId}`,
    entityType: 'Supplier',
    entityId,
  }),

  supplierRejected: (
    adminMemberId: string,
    supplierName: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'SUPPLIER_REJECTED',
    title: 'Supplier Rejected',
    message: reason
      ? `Supplier ${supplierName} has been rejected. Reason: ${reason}`
      : `Supplier ${supplierName} has been rejected.`,
    link: `/admin/suppliers/${entityId}`,
    entityType: 'Supplier',
    entityId,
  }),

  // Payroll Management
  payrollSubmitted: (
    adminMemberId: string,
    referenceNumber: string,
    periodLabel: string,
    totalAmount: string,
    currency: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'PAYROLL_SUBMITTED',
    title: 'Payroll Submitted for Approval',
    message: `Payroll ${referenceNumber} (${periodLabel}) for ${currency} ${totalAmount} has been submitted for approval.`,
    link: `/admin/payroll/runs/${entityId}`,
    entityType: 'PayrollRun',
    entityId,
  }),

  payrollApproved: (
    adminMemberId: string,
    referenceNumber: string,
    periodLabel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminMemberId,
    type: 'PAYROLL_APPROVED',
    title: 'Payroll Approved',
    message: `Payroll ${referenceNumber} (${periodLabel}) has been approved.`,
    link: `/admin/payroll/runs/${entityId}`,
    entityType: 'PayrollRun',
    entityId,
  }),
};
