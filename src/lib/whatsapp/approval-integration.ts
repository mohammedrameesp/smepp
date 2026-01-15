/**
 * WhatsApp Integration with Approval Workflow
 *
 * Provides functions to send WhatsApp notifications when approval
 * requests are created or when steps need to be notified.
 *
 * This is a non-blocking integration - failures don't affect the
 * main approval workflow.
 */

import { prisma } from '@/lib/core/prisma';
import { ApprovalModule, Role } from '@prisma/client';
import {
  sendApprovalNotification,
  canSendWhatsAppNotification,
} from './send-notification';
import logger from '@/lib/core/log';
import { invalidateTokensForEntity } from './action-tokens';
import type { ApprovalEntityType, ApprovalDetails } from './types';

/**
 * Convert ApprovalModule to ApprovalEntityType
 */
function toEntityType(module: ApprovalModule): ApprovalEntityType {
  switch (module) {
    case 'LEAVE_REQUEST':
      return 'LEAVE_REQUEST';
    case 'PURCHASE_REQUEST':
      return 'PURCHASE_REQUEST';
    case 'ASSET_REQUEST':
      return 'ASSET_REQUEST';
    default:
      return 'LEAVE_REQUEST';
  }
}

/**
 * Get approval details for a leave request
 */
async function getLeaveRequestDetails(requestId: string): Promise<ApprovalDetails | null> {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      member: { select: { name: true } },
      leaveType: { select: { name: true } },
    },
  });

  if (!request) return null;

  return {
    requesterName: request.member?.name || 'Employee',
    leaveType: request.leaveType.name,
    startDate: request.startDate,
    endDate: request.endDate,
    totalDays: Number(request.totalDays),
    reason: request.reason || undefined,
  };
}

/**
 * Get approval details for a purchase request
 */
async function getPurchaseRequestDetails(requestId: string): Promise<ApprovalDetails | null> {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: requestId },
    include: {
      requester: { select: { name: true } },
    },
  });

  if (!request) return null;

  return {
    requesterName: request.requester.name || 'Employee',
    title: request.title,
    totalAmount: Number(request.totalAmount),
    currency: request.currency,
  };
}

/**
 * Get approval details for an asset request
 */
async function getAssetRequestDetails(requestId: string): Promise<ApprovalDetails | null> {
  const request = await prisma.assetRequest.findUnique({
    where: { id: requestId },
    include: {
      member: { select: { name: true } },
      asset: { select: { model: true, type: true } },
    },
  });

  if (!request) return null;

  return {
    requesterName: request.member?.name || 'Employee',
    assetName: request.asset?.model || 'Asset',
    assetType: request.asset?.type || 'Equipment',
    justification: request.reason || undefined,
  };
}

/**
 * Get approval details based on entity type
 */
async function getApprovalDetails(
  entityType: ApprovalEntityType,
  entityId: string
): Promise<ApprovalDetails | null> {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return getLeaveRequestDetails(entityId);
    case 'PURCHASE_REQUEST':
      return getPurchaseRequestDetails(entityId);
    case 'ASSET_REQUEST':
      return getAssetRequestDetails(entityId);
    default:
      return null;
  }
}

/**
 * Find approvers with the required role for a pending approval step.
 * Returns user IDs who can receive the WhatsApp notification.
 */
async function findApproversForRole(
  tenantId: string,
  requiredRole: Role
): Promise<string[]> {
  // Get team members with admin role (who can approve anything)
  // Note: With the new permission model, only admins can approve requests
  const members = await prisma.teamMember.findMany({
    where: {
      tenantId,
      isDeleted: false,
      isAdmin: true,
    },
    select: { id: true },
  });

  return members.map((m) => m.id);
}

/**
 * Send WhatsApp notifications to approvers when an approval chain is created.
 *
 * This function is non-blocking and should be called after creating approval steps.
 * It sends notifications to all users who can approve the first pending step.
 *
 * @param tenantId - The tenant ID
 * @param entityType - The type of entity (LEAVE_REQUEST, PURCHASE_REQUEST, ASSET_REQUEST)
 * @param entityId - The entity ID
 * @param firstStepRole - The role required for the first approval step
 */
export async function notifyApproversViaWhatsApp(
  tenantId: string,
  entityType: ApprovalModule,
  entityId: string,
  firstStepRole: Role
): Promise<void> {
  // Debug: Ensure function is called
  console.log('>>> WhatsApp notifyApproversViaWhatsApp CALLED', { tenantId, entityType, entityId, firstStepRole });

  const logContext = { tenantId, entityType, entityId, firstStepRole };
  logger.info(logContext, 'WhatsApp Integration: Starting notifyApproversViaWhatsApp');

  try {
    // Get approval details for the notification
    const entityTypeMapped = toEntityType(entityType);
    const details = await getApprovalDetails(entityTypeMapped, entityId);

    if (!details) {
      logger.warn(logContext, 'WhatsApp Integration: No details found for entity');
      return;
    }
    logger.debug({ ...logContext, details }, 'WhatsApp Integration: Got approval details');

    // Find all users who can approve this step
    const approverIds = await findApproversForRole(tenantId, firstStepRole);
    logger.info({ ...logContext, approverCount: approverIds.length, approverIds }, 'WhatsApp Integration: Found approvers');

    if (approverIds.length === 0) {
      logger.warn(logContext, 'WhatsApp Integration: No approvers found');
      return;
    }

    // Send notifications to each approver (non-blocking)
    const notificationPromises = approverIds.map(async (approverId) => {
      const canSend = await canSendWhatsAppNotification(tenantId, approverId);
      logger.debug({ ...logContext, approverId, canSend: canSend.canSend, reason: canSend.reason }, 'WhatsApp Integration: canSend check');

      if (!canSend.canSend) {
        logger.warn({ ...logContext, approverId, reason: canSend.reason }, 'WhatsApp Integration: Skipping approver');
        return;
      }

      logger.info({ ...logContext, approverId }, 'WhatsApp Integration: Sending notification to approver');
      await sendApprovalNotification({
        tenantId,
        approverId,
        entityType: entityTypeMapped,
        entityId,
        details,
      });
    });

    // Execute all notifications in parallel (don't await)
    Promise.all(notificationPromises).catch((error) => {
      logger.error({ ...logContext, error: error instanceof Error ? error.message : 'Unknown error' }, 'WhatsApp Integration: Error sending notifications');
    });
  } catch (error) {
    // Log but don't throw - WhatsApp notifications are non-critical
    logger.error({ ...logContext, error: error instanceof Error ? error.message : 'Unknown error' }, 'WhatsApp Integration: Error in notifyApproversViaWhatsApp');
  }
}

/**
 * Invalidate WhatsApp action tokens when a request is processed through web UI.
 *
 * Call this when a request is approved/rejected through the web interface
 * to prevent the WhatsApp buttons from still working.
 */
export async function invalidateWhatsAppTokens(
  entityType: ApprovalModule,
  entityId: string
): Promise<void> {
  try {
    await invalidateTokensForEntity(toEntityType(entityType), entityId);
  } catch (error) {
    console.error('WhatsApp: Error invalidating tokens:', error);
  }
}

/**
 * Helper to send notifications after approval chain initialization.
 *
 * Use this in API routes after calling initializeApprovalChain:
 *
 * ```typescript
 * const steps = await initializeApprovalChain(entityType, entityId, policy, tenantId);
 * if (steps.length > 0) {
 *   notifyApproversViaWhatsApp(
 *     tenantId,
 *     entityType,
 *     entityId,
 *     steps[0].requiredRole
 *   );
 * }
 * ```
 */
