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
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<boolean> {
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
 */
export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
): Promise<number> {
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
      })),
    });
    return result.count;
  } catch (error) {
    console.error('Failed to create bulk notifications:', error);
    return 0;
  }
}

/**
 * Helper templates for common notification scenarios.
 * Returns the input object for createNotification().
 */
export const NotificationTemplates = {
  // Leave Management
  leaveSubmitted: (
    adminId: string,
    requesterName: string,
    requestNumber: string,
    leaveType: string,
    totalDays: number,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminId,
    type: 'LEAVE_REQUEST_SUBMITTED',
    title: 'New Leave Request',
    message: `${requesterName} submitted a ${leaveType} request (${requestNumber}) for ${totalDays} day${totalDays === 1 ? '' : 's'}.`,
    link: `/admin/leave/requests/${entityId}`,
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveApproved: (
    userId: string,
    requestNumber: string,
    leaveType: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'LEAVE_REQUEST_APPROVED',
    title: 'Leave Request Approved',
    message: `Your ${leaveType} request (${requestNumber}) has been approved.`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveRejected: (
    userId: string,
    requestNumber: string,
    leaveType: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'LEAVE_REQUEST_REJECTED',
    title: 'Leave Request Rejected',
    message: `Your ${leaveType} request (${requestNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/employee/leave',
    entityType: 'LeaveRequest',
    entityId,
  }),

  leaveCancelled: (
    userId: string,
    requestNumber: string,
    leaveType: string,
    cancelledByAdmin: boolean,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
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
    userId: string,
    assetTag: string,
    assetModel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_ASSIGNED',
    title: 'Asset Assigned',
    message: `${assetModel} (${assetTag}) has been assigned to you.`,
    link: '/employee/my-assets',
    entityType: 'Asset',
    entityId,
  }),

  assetUnassigned: (
    userId: string,
    assetTag: string,
    assetModel: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_UNASSIGNED',
    title: 'Asset Returned',
    message: `${assetModel} (${assetTag}) has been unassigned from you.`,
    link: '/employee/my-assets',
    entityType: 'Asset',
    entityId,
  }),

  // Asset Requests
  assetRequestSubmitted: (
    adminId: string,
    requesterName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminId,
    type: 'ASSET_REQUEST_SUBMITTED',
    title: 'New Asset Request',
    message: `${requesterName} requested asset ${assetModel} (${assetTag}) - ${requestNumber}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetReturnSubmitted: (
    adminId: string,
    requesterName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminId,
    type: 'ASSET_RETURN_SUBMITTED',
    title: 'Asset Return Request',
    message: `${requesterName} wants to return ${assetModel} (${assetTag}) - ${requestNumber}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetAssignmentPending: (
    userId: string,
    assetTag: string,
    assetModel: string,
    assignerName: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_ASSIGNMENT_PENDING',
    title: 'Asset Assignment Pending',
    message: `${assignerName} wants to assign ${assetModel} (${assetTag}) to you. Please accept or decline.`,
    link: `/employee/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetAssignmentAccepted: (
    adminId: string,
    userName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminId,
    type: 'ASSET_ASSIGNMENT_ACCEPTED',
    title: 'Asset Assignment Accepted',
    message: `${userName} accepted the assignment of ${assetModel} (${assetTag}) - ${requestNumber}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetAssignmentDeclined: (
    adminId: string,
    userName: string,
    assetTag: string,
    assetModel: string,
    requestNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminId,
    type: 'ASSET_ASSIGNMENT_DECLINED',
    title: 'Asset Assignment Declined',
    message: `${userName} declined the assignment of ${assetModel} (${assetTag}) - ${requestNumber}${reason ? `. Reason: ${reason}` : ''}`,
    link: `/admin/asset-requests/${entityId}`,
    entityType: 'AssetRequest',
    entityId,
  }),

  assetRequestApproved: (
    userId: string,
    assetTag: string,
    requestNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_REQUEST_APPROVED',
    title: 'Asset Request Approved',
    message: `Your request for asset ${assetTag} (${requestNumber}) has been approved.`,
    link: '/employee/asset-requests',
    entityType: 'AssetRequest',
    entityId,
  }),

  assetRequestRejected: (
    userId: string,
    assetTag: string,
    requestNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'ASSET_REQUEST_REJECTED',
    title: 'Asset Request Rejected',
    message: `Your request for asset ${assetTag} (${requestNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: '/employee/asset-requests',
    entityType: 'AssetRequest',
    entityId,
  }),

  // Purchase Requests
  purchaseRequestSubmitted: (
    adminId: string,
    referenceNumber: string,
    requesterName: string,
    title: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: adminId,
    type: 'PURCHASE_REQUEST_SUBMITTED',
    title: 'New Purchase Request',
    message: `${requesterName} submitted a purchase request (${referenceNumber}): ${title}`,
    link: `/admin/purchase-requests/${entityId}`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  purchaseRequestApproved: (
    userId: string,
    referenceNumber: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'PURCHASE_REQUEST_APPROVED',
    title: 'Purchase Request Approved',
    message: `Your purchase request (${referenceNumber}) has been approved.`,
    link: `/employee/purchase-requests`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  purchaseRequestRejected: (
    userId: string,
    referenceNumber: string,
    reason?: string,
    entityId?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'PURCHASE_REQUEST_REJECTED',
    title: 'Purchase Request Rejected',
    message: `Your purchase request (${referenceNumber}) was rejected.${reason ? ` Reason: ${reason}` : ''}`,
    link: `/employee/purchase-requests`,
    entityType: 'PurchaseRequest',
    entityId,
  }),

  // Document Expiry Warnings
  documentExpiryWarning: (
    userId: string,
    documentType: string,
    daysUntilExpiry: number
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'DOCUMENT_EXPIRY_WARNING',
    title: 'Document Expiring Soon',
    message: `Your ${documentType} will expire in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Please renew it.`,
    link: '/profile',
    entityType: 'HRProfile',
  }),

  // General notification
  general: (
    userId: string,
    title: string,
    message: string,
    link?: string
  ): CreateNotificationInput => ({
    recipientId: userId,
    type: 'GENERAL',
    title,
    message,
    link,
  }),
};
