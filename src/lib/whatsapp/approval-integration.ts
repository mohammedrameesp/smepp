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
    case 'SPEND_REQUEST':
      return 'SPEND_REQUEST';
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
 * Get approval details for a spend request
 */
async function getSpendRequestDetails(requestId: string): Promise<ApprovalDetails | null> {
  const request = await prisma.spendRequest.findUnique({
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
    case 'SPEND_REQUEST':
      return getSpendRequestDetails(entityId);
    case 'ASSET_REQUEST':
      return getAssetRequestDetails(entityId);
    default:
      return null;
  }
}

/**
 * Find approvers with the required role for a pending approval step.
 * Returns user IDs who can receive the WhatsApp notification.
 *
 * Role to Permission Mapping:
 * - MANAGER: The requester's direct manager (via reportingToId)
 * - HR_MANAGER: Team members with hasHRAccess=true
 * - FINANCE_MANAGER: Team members with hasFinanceAccess=true
 * - OPERATIONS_MANAGER: Team members with hasOperationsAccess=true
 * - DIRECTOR/ADMIN: Team members with isAdmin=true (fallback to isOwner)
 */
async function findApproversForRole(
  tenantId: string,
  requiredRole: Role,
  requesterId?: string
): Promise<string[]> {
  switch (requiredRole) {
    case 'MANAGER':
      // Get the requester's direct manager
      if (requesterId) {
        const requester = await prisma.teamMember.findUnique({
          where: { id: requesterId },
          select: { reportingToId: true },
        });
        if (requester?.reportingToId) {
          return [requester.reportingToId];
        }
      }
      return [];

    case 'HR_MANAGER':
      // Get all team members with HR access
      const hrMembers = await prisma.teamMember.findMany({
        where: { tenantId, hasHRAccess: true, isDeleted: false },
        select: { id: true },
      });
      return hrMembers.map((m) => m.id);

    case 'FINANCE_MANAGER':
      // Get all team members with Finance access
      const financeMembers = await prisma.teamMember.findMany({
        where: { tenantId, hasFinanceAccess: true, isDeleted: false },
        select: { id: true },
      });
      return financeMembers.map((m) => m.id);

    case 'OPERATIONS_MANAGER':
      // Get all team members with Operations access
      const opsMembers = await prisma.teamMember.findMany({
        where: { tenantId, hasOperationsAccess: true, isDeleted: false },
        select: { id: true },
      });
      return opsMembers.map((m) => m.id);

    case 'DIRECTOR':
    case 'ADMIN':
      // Get all admins first
      const admins = await prisma.teamMember.findMany({
        where: { tenantId, isAdmin: true, isDeleted: false },
        select: { id: true },
      });
      if (admins.length > 0) {
        return admins.map((m) => m.id);
      }
      // Fallback to owners if no admins
      const owners = await prisma.teamMember.findMany({
        where: { tenantId, isOwner: true, isDeleted: false },
        select: { id: true },
      });
      return owners.map((m) => m.id);

    default:
      return [];
  }
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
 * @param requesterId - The requester's team member ID (needed for MANAGER role lookup)
 */
export async function notifyApproversViaWhatsApp(
  tenantId: string,
  entityType: ApprovalModule,
  entityId: string,
  firstStepRole: Role,
  requesterId?: string
): Promise<void> {
  const logContext = { tenantId, entityType, entityId, firstStepRole, requesterId };
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

    // Find all users who can approve this step (role-based routing)
    const approverIds = await findApproversForRole(tenantId, firstStepRole, requesterId);
    logger.info({ ...logContext, approverCount: approverIds.length, approverIds }, 'WhatsApp Integration: Found approvers');

    if (approverIds.length === 0) {
      logger.warn(logContext, 'WhatsApp Integration: No approvers found for role');
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
 * Send WhatsApp notifications to the next level approvers when a step is approved.
 *
 * This function is called when an approval step is approved and there are more
 * pending steps in the chain. It notifies the approvers for the next level.
 *
 * @param tenantId - The tenant ID
 * @param entityType - The type of entity (LEAVE_REQUEST, PURCHASE_REQUEST, ASSET_REQUEST)
 * @param entityId - The entity ID
 * @param nextStepRole - The role required for the next approval step
 * @param requesterId - The requester's team member ID (needed for MANAGER role lookup)
 */
export async function notifyNextLevelApproversViaWhatsApp(
  tenantId: string,
  entityType: ApprovalModule,
  entityId: string,
  nextStepRole: Role,
  requesterId?: string
): Promise<void> {
  const logContext = { tenantId, entityType, entityId, nextStepRole, requesterId };
  logger.info(logContext, 'WhatsApp Integration: Notifying next level approvers');

  try {
    // Get approval details for the notification
    const entityTypeMapped = toEntityType(entityType);
    const details = await getApprovalDetails(entityTypeMapped, entityId);

    if (!details) {
      logger.warn(logContext, 'WhatsApp Integration: No details found for entity');
      return;
    }

    // Find all users who can approve the next step (role-based routing)
    const approverIds = await findApproversForRole(tenantId, nextStepRole, requesterId);
    logger.info({ ...logContext, approverCount: approverIds.length, approverIds }, 'WhatsApp Integration: Found next level approvers');

    if (approverIds.length === 0) {
      logger.warn(logContext, 'WhatsApp Integration: No approvers found for next level');
      return;
    }

    // Send notifications to each approver (non-blocking)
    const notificationPromises = approverIds.map(async (approverId) => {
      const canSend = await canSendWhatsAppNotification(tenantId, approverId);

      if (!canSend.canSend) {
        logger.warn({ ...logContext, approverId, reason: canSend.reason }, 'WhatsApp Integration: Skipping next level approver');
        return;
      }

      logger.info({ ...logContext, approverId }, 'WhatsApp Integration: Sending notification to next level approver');
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
      logger.error({ ...logContext, error: error instanceof Error ? error.message : 'Unknown error' }, 'WhatsApp Integration: Error sending next level notifications');
    });
  } catch (error) {
    // Log but don't throw - WhatsApp notifications are non-critical
    logger.error({ ...logContext, error: error instanceof Error ? error.message : 'Unknown error' }, 'WhatsApp Integration: Error in notifyNextLevelApproversViaWhatsApp');
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
 * const steps = await initializeApprovalChain(entityType, entityId, policy, tenantId, requesterId);
 * if (steps.length > 0) {
 *   notifyApproversViaWhatsApp(
 *     tenantId,
 *     entityType,
 *     entityId,
 *     steps[0].requiredRole,
 *     requesterId // Required for MANAGER role routing
 *   );
 * }
 * ```
 */
