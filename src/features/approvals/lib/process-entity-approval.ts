/**
 * @file process-entity-approval.ts
 * @description Shared utility for processing entity approvals through approval chains.
 *              This consolidates approval logic across leave, asset, and purchase request modules.
 * @module features/approvals
 */

import { prisma } from '@/lib/core/prisma';
import { ApprovalModule } from '@prisma/client';
import {
  getApprovalChain,
  getApprovalChainSummary,
  getCurrentPendingStep,
  getApproversForRole,
  hasApprovalChain,
  canMemberApprove,
} from './approval-engine';
import { createBulkNotifications } from '@/features/notifications/lib';
import { sendEmail } from '@/lib/core/email';
import { emailWrapper } from '@/lib/core/email-utils';
import { notifyApproversViaWhatsApp } from '@/lib/whatsapp';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProcessEntityApprovalParams {
  /** The type of entity being approved */
  entityType: ApprovalModule;
  /** The ID of the entity being approved */
  entityId: string;
  /** The ID of the approver (current user) */
  approverId: string;
  /** The ID of the original requester */
  requesterId: string;
  /** The tenant ID */
  tenantId: string;
  /** Optional notes for the approval */
  notes?: string;
  /** Whether this is an approval or rejection */
  action: 'APPROVE' | 'REJECT';
  /** Function to get notification context for next level approvers */
  getNotificationContext?: () => Promise<{
    requesterName: string;
    referenceNumber: string;
    entityDescription?: string;
  }>;
}

export interface ProcessEntityApprovalResult {
  /** Whether an approval chain exists for this entity */
  chainExists: boolean;
  /** Whether the chain is now complete */
  isChainComplete: boolean;
  /** Whether a step was successfully processed */
  stepProcessed: boolean;
  /** Error message if processing failed */
  error?: string;
  /** The updated approval chain (if chain exists) */
  approvalChain?: Awaited<ReturnType<typeof getApprovalChain>>;
  /** The approval chain summary (if chain exists) */
  approvalSummary?: Awaited<ReturnType<typeof getApprovalChainSummary>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process an entity approval through its approval chain (if exists).
 *
 * This function:
 * 1. Checks if an approval chain exists for the entity
 * 2. If yes, processes the current pending step
 * 3. Notifies next level approvers if chain is not complete
 * 4. Returns the result for the caller to handle entity status updates
 *
 * @param params - The approval parameters
 * @returns Result indicating chain status and whether entity can be updated
 *
 * @example
 * const result = await processEntityApproval({
 *   entityType: 'LEAVE_REQUEST',
 *   entityId: 'leave-123',
 *   approverId: 'user-456',
 *   requesterId: 'user-789',
 *   tenantId: 'org-abc',
 *   action: 'APPROVE',
 *   notes: 'Approved for team coverage',
 *   getNotificationContext: async () => ({
 *     requesterName: 'John Doe',
 *     referenceNumber: 'LR-25-001',
 *     entityDescription: '5 days annual leave',
 *   }),
 * });
 *
 * if (!result.chainExists || result.isChainComplete) {
 *   // Update entity status to APPROVED
 * }
 */
export async function processEntityApproval(
  params: ProcessEntityApprovalParams
): Promise<ProcessEntityApprovalResult> {
  const {
    entityType,
    entityId,
    approverId,
    requesterId,
    tenantId,
    notes,
    action,
    getNotificationContext,
  } = params;

  // Check if approval chain exists
  const chainExists = await hasApprovalChain(entityType, entityId);

  if (!chainExists) {
    return {
      chainExists: false,
      isChainComplete: true,
      stepProcessed: false,
    };
  }

  // Get current pending step
  const pendingStep = await getCurrentPendingStep(entityType, entityId);

  if (!pendingStep) {
    // No pending steps - chain already complete
    const approvalChain = await getApprovalChain(entityType, entityId);
    const approvalSummary = await getApprovalChainSummary(entityType, entityId);
    return {
      chainExists: true,
      isChainComplete: true,
      stepProcessed: false,
      approvalChain,
      approvalSummary,
    };
  }

  // Check if user can approve this step
  const canApproveResult = await canMemberApprove(approverId, pendingStep, requesterId);

  if (!canApproveResult.canApprove) {
    return {
      chainExists: true,
      isChainComplete: false,
      stepProcessed: false,
      error: canApproveResult.reason || 'Not authorized to approve',
    };
  }

  // Process the step atomically
  const now = new Date();
  const newStepStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  const updateResult = await prisma.approvalStep.updateMany({
    where: {
      id: pendingStep.id,
      status: 'PENDING', // Atomic check to prevent race conditions
    },
    data: {
      status: newStepStatus,
      approverId,
      actionAt: now,
      notes,
    },
  });

  if (updateResult.count === 0) {
    return {
      chainExists: true,
      isChainComplete: false,
      stepProcessed: false,
      error: 'Step already processed',
    };
  }

  // If rejected, skip all remaining steps
  if (action === 'REJECT') {
    await prisma.approvalStep.updateMany({
      where: {
        entityType,
        entityId,
        status: 'PENDING',
      },
      data: {
        status: 'SKIPPED',
      },
    });
  }

  // Check if chain is now complete
  const remainingPending = await prisma.approvalStep.count({
    where: {
      entityType,
      entityId,
      status: 'PENDING',
    },
  });

  const isChainComplete = remainingPending === 0;

  // Get chain info for response
  const approvalChain = await getApprovalChain(entityType, entityId);
  const approvalSummary = await getApprovalChainSummary(entityType, entityId);

  // If chain not complete and approved, notify next level approvers
  if (!isChainComplete && action === 'APPROVE' && getNotificationContext) {
    await notifyNextLevelApprovers({
      entityType,
      entityId,
      requesterId,
      tenantId,
      getNotificationContext,
    });
  }

  return {
    chainExists: true,
    isChainComplete,
    stepProcessed: true,
    approvalChain,
    approvalSummary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface NotifyNextLevelParams {
  entityType: ApprovalModule;
  entityId: string;
  requesterId: string;
  tenantId: string;
  getNotificationContext: () => Promise<{
    requesterName: string;
    referenceNumber: string;
    entityDescription?: string;
  }>;
}

/**
 * Notify next level approvers about a pending approval
 */
async function notifyNextLevelApprovers(params: NotifyNextLevelParams): Promise<void> {
  const { entityType, entityId, requesterId, tenantId, getNotificationContext } = params;

  try {
    const nextPendingStep = await getCurrentPendingStep(entityType, entityId);

    if (!nextPendingStep) {
      return;
    }

    const nextLevelApprovers = await getApproversForRole(
      nextPendingStep.requiredRole,
      tenantId,
      requesterId
    );

    // Filter out the requester
    const filteredApprovers = nextLevelApprovers.filter(a => a.id !== requesterId);

    if (filteredApprovers.length === 0) {
      return;
    }

    // Fetch organization for branding
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true, primaryColor: true },
    });
    const orgName = org?.name || 'Durj';
    const brandColor = org?.primaryColor || undefined;

    const context = await getNotificationContext();
    const entityLabel = getEntityLabel(entityType);
    const link = getEntityLink(entityType, entityId);

    // Send WhatsApp notifications
    notifyApproversViaWhatsApp(tenantId, entityType, entityId, nextPendingStep.requiredRole, requesterId);

    // Send in-app notifications
    const notifications = filteredApprovers.map(approver => ({
      recipientId: approver.id,
      type: 'APPROVAL_PENDING' as const,
      title: `${entityLabel} Pending Your Approval`,
      message: context.entityDescription
        ? `${context.requesterName}'s ${entityLabel.toLowerCase()} (${context.referenceNumber}) - ${context.entityDescription} - has been forwarded to you for approval.`
        : `${context.requesterName}'s ${entityLabel.toLowerCase()} (${context.referenceNumber}) has been forwarded to you for approval.`,
      link,
      entityType: getEntityTypeName(entityType),
      entityId,
    }));
    await createBulkNotifications(notifications, tenantId);

    // Build email content
    const message = context.entityDescription
      ? `${context.requesterName}'s ${entityLabel.toLowerCase()} (${context.referenceNumber}) - ${context.entityDescription} - requires your approval.`
      : `${context.requesterName}'s ${entityLabel.toLowerCase()} (${context.referenceNumber}) requires your approval.`;

    const emailContent = `
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        ${message}
      </p>
      <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
        Please review and take action on this request.
      </p>
    `;

    // Send email notifications
    for (const approver of filteredApprovers) {
      sendEmail({
        to: approver.email,
        subject: `${entityLabel} Pending: ${context.referenceNumber}`,
        html: emailWrapper(emailContent, orgName, brandColor),
        text: message,
      }).catch(err => logger.error({
        error: err instanceof Error ? err.message : 'Unknown error',
        entityType,
        entityId,
      }, `Failed to send ${entityLabel.toLowerCase()} approval forward email`));
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      entityType,
      entityId,
    }, 'Failed to send next level approval notifications');
  }
}

/**
 * Get human-readable label for entity type
 */
function getEntityLabel(entityType: ApprovalModule): string {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return 'Leave Request';
    case 'ASSET_REQUEST':
      return 'Asset Request';
    case 'SPEND_REQUEST':
      return 'Spend Request';
    default:
      return 'Request';
  }
}

/**
 * Get the entity type name for notification entityType field
 */
function getEntityTypeName(entityType: ApprovalModule): string {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return 'LeaveRequest';
    case 'ASSET_REQUEST':
      return 'AssetRequest';
    case 'SPEND_REQUEST':
      return 'SpendRequest';
    default:
      return 'Request';
  }
}

/**
 * Get admin link for entity
 */
function getEntityLink(entityType: ApprovalModule, entityId: string): string {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return `/admin/leave/requests/${entityId}`;
    case 'ASSET_REQUEST':
      return `/admin/asset-requests/${entityId}`;
    case 'SPEND_REQUEST':
      return `/admin/spend-requests/${entityId}`;
    default:
      return '/admin';
  }
}
