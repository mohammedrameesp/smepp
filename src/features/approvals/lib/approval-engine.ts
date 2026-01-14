/**
 * @file approval-engine.ts
 * @description Multi-level approval workflow engine. Handles policy matching, approval chain
 *              initialization, step processing, and admin bypass functionality.
 *              Supports leave requests, purchase requests, and asset requests with configurable
 *              thresholds and role-based approval levels.
 * @module domains/system/approvals
 */

import { prisma } from '@/lib/core/prisma';
import {
  ApprovalModule,
  ApprovalStepStatus,
  Role,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApprovalPolicyWithLevels {
  id: string;
  name: string;
  module: ApprovalModule;
  isActive: boolean;
  minAmount: Decimal | null;
  maxAmount: Decimal | null;
  minDays: number | null;
  maxDays: number | null;
  priority: number;
  levels: {
    id: string;
    levelOrder: number;
    approverRole: Role;
  }[];
}

export interface ApprovalStepWithApprover {
  id: string;
  entityType: ApprovalModule;
  entityId: string;
  levelOrder: number;
  requiredRole: Role;
  approverId: string | null;
  approver: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  status: ApprovalStepStatus;
  actionAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find the applicable approval policy for a request based on module and thresholds.
 * Policies are sorted by priority (higher first), then by specificity.
 * IMPORTANT: tenantId is required for proper tenant isolation.
 */
export async function findApplicablePolicy(
  module: ApprovalModule,
  options?: { amount?: number; days?: number; tenantId?: string }
): Promise<ApprovalPolicyWithLevels | null> {
  // Build where clause with tenant filter if provided
  const where: { module: ApprovalModule; isActive: boolean; tenantId?: string } = {
    module,
    isActive: true,
  };

  if (options?.tenantId) {
    where.tenantId = options.tenantId;
  }

  const policies = await prisma.approvalPolicy.findMany({
    where,
    include: {
      levels: {
        orderBy: { levelOrder: 'asc' },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  if (policies.length === 0) return null;

  // Find the first matching policy based on thresholds
  for (const policy of policies) {
    // For leave requests, check days threshold
    if (module === 'LEAVE_REQUEST' && options?.days !== undefined) {
      const minDays = policy.minDays ?? 0;
      const maxDays = policy.maxDays ?? Infinity;
      if (options.days >= minDays && options.days <= maxDays) {
        return policy;
      }
    }

    // For purchase/asset requests, check amount threshold
    if ((module === 'PURCHASE_REQUEST' || module === 'ASSET_REQUEST') && options?.amount !== undefined) {
      const minAmount = policy.minAmount ? Number(policy.minAmount) : 0;
      const maxAmount = policy.maxAmount ? Number(policy.maxAmount) : Infinity;
      if (options.amount >= minAmount && options.amount <= maxAmount) {
        return policy;
      }
    }

    // If no thresholds specified in options, return first active policy
    if (options?.days === undefined && options?.amount === undefined) {
      return policy;
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL CHAIN INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize an approval chain for an entity based on a policy.
 * Creates ApprovalStep records for each level in the policy.
 */
export async function initializeApprovalChain(
  entityType: ApprovalModule,
  entityId: string,
  policy: ApprovalPolicyWithLevels,
  tenantId?: string
): Promise<ApprovalStepWithApprover[]> {
  // Create approval steps for each level
  const stepsData = policy.levels.map((level) => ({
    entityType,
    entityId,
    levelOrder: level.levelOrder,
    requiredRole: level.approverRole,
    status: 'PENDING' as ApprovalStepStatus,
    tenantId: tenantId || 'SYSTEM',
  }));

  // Use createMany for efficiency
  await prisma.approvalStep.createMany({
    data: stepsData,
  });

  // Return the created steps with full data
  return prisma.approvalStep.findMany({
    where: { entityType, entityId },
    include: {
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { levelOrder: 'asc' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL CHAIN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the full approval chain for an entity.
 */
export async function getApprovalChain(
  entityType: ApprovalModule,
  entityId: string
): Promise<ApprovalStepWithApprover[]> {
  return prisma.approvalStep.findMany({
    where: { entityType, entityId },
    include: {
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { levelOrder: 'asc' },
  });
}

/**
 * Get the current pending step in the approval chain (the next one to approve).
 * Returns null if all steps are completed or none exist.
 */
export async function getCurrentPendingStep(
  entityType: ApprovalModule,
  entityId: string
): Promise<ApprovalStepWithApprover | null> {
  return prisma.approvalStep.findFirst({
    where: {
      entityType,
      entityId,
      status: 'PENDING',
    },
    include: {
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { levelOrder: 'asc' },
  });
}

/**
 * Check if a member can approve a specific step.
 * Member can approve if:
 * 1. They are an admin (isAdmin = true) - can approve anyone
 * 2. They have canApprove = true and the requester reports to them
 */
export async function canMemberApprove(
  memberId: string,
  step: ApprovalStepWithApprover,
  requesterId?: string
): Promise<{ canApprove: boolean; reason?: string }> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { id: true, isAdmin: true, canApprove: true },
  });

  if (!member) {
    return { canApprove: false, reason: 'Member not found' };
  }

  // Admin can approve anything
  if (member.isAdmin) {
    return { canApprove: true };
  }

  // If member has canApprove permission, check if they can approve this specific request
  if (member.canApprove) {
    // If we have a requesterId, verify the requester reports to this member
    if (requesterId) {
      const requester = await prisma.teamMember.findUnique({
        where: { id: requesterId },
        select: { reportingToId: true },
      });

      if (requester?.reportingToId === member.id) {
        return { canApprove: true };
      }
    } else {
      // If no requesterId provided, allow approval (backwards compatibility)
      // The caller should ideally always provide requesterId for proper authorization
      return { canApprove: true };
    }
  }

  return {
    canApprove: false,
    reason: 'Not authorized to approve this request',
  };
}

// Backwards compatibility alias
export const canUserApprove = canMemberApprove;

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProcessApprovalResult {
  success: boolean;
  step: ApprovalStepWithApprover;
  isChainComplete: boolean;
  allApproved: boolean;
  error?: string;
}

/**
 * Process an approval action (approve or reject) on a step.
 */
export async function processApproval(
  stepId: string,
  approverId: string,
  action: 'APPROVE' | 'REJECT',
  notes?: string
): Promise<ProcessApprovalResult> {
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: {
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!step) {
    throw new Error('Approval step not found');
  }

  if (step.status !== 'PENDING') {
    throw new Error(`Step already ${step.status.toLowerCase()}`);
  }

  // Check if user can approve
  const canApproveResult = await canUserApprove(approverId, step);
  if (!canApproveResult.canApprove) {
    throw new Error(canApproveResult.reason || 'Not authorized to approve');
  }

  const newStatus: ApprovalStepStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  // Update the step
  const updatedStep = await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      status: newStatus,
      approverId,
      actionAt: new Date(),
      notes,
    },
    include: {
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // If rejected, skip all remaining steps
  if (action === 'REJECT') {
    await prisma.approvalStep.updateMany({
      where: {
        entityType: step.entityType,
        entityId: step.entityId,
        status: 'PENDING',
      },
      data: {
        status: 'SKIPPED',
      },
    });

    return {
      success: true,
      step: updatedStep,
      isChainComplete: true,
      allApproved: false,
    };
  }

  // Check if all steps are now approved
  const remainingPendingSteps = await prisma.approvalStep.count({
    where: {
      entityType: step.entityType,
      entityId: step.entityId,
      status: 'PENDING',
    },
  });

  const isChainComplete = remainingPendingSteps === 0;
  const allApproved = isChainComplete;

  return {
    success: true,
    step: updatedStep,
    isChainComplete,
    allApproved,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN BYPASS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ADMIN bypass: Approve all remaining steps in the chain at once.
 */
export async function adminBypassApproval(
  entityType: ApprovalModule,
  entityId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const now = new Date();

  await prisma.approvalStep.updateMany({
    where: {
      entityType,
      entityId,
      status: 'PENDING',
    },
    data: {
      status: 'APPROVED',
      approverId: adminId,
      actionAt: now,
      notes: notes || 'Approved by admin (bypass)',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PENDING APPROVALS QUERY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all pending approval steps for a team member based on their permissions.
 * IMPORTANT: tenantId is required for proper tenant isolation.
 *
 * @param memberId - The TeamMember ID (not User ID)
 * @param tenantId - The tenant ID for proper isolation
 */
export async function getPendingApprovalsForUser(
  memberId: string,
  tenantId?: string
): Promise<ApprovalStepWithApprover[]> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { id: true, isAdmin: true, canApprove: true },
  });

  if (!member) return [];

  // Build base where clause with tenant filter if provided
  const baseWhere: { status: 'PENDING'; tenantId?: string } = { status: 'PENDING' };
  if (tenantId) {
    baseWhere.tenantId = tenantId;
  }

  // Admins can see all pending approvals (within tenant)
  if (member.isAdmin) {
    return prisma.approvalStep.findMany({
      where: baseWhere,
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // If member has canApprove permission, get approvals from their direct reports
  if (member.canApprove) {
    // Get all team members who report to this member
    const directReports = await prisma.teamMember.findMany({
      where: {
        reportingToId: member.id,
        ...(tenantId ? { tenantId } : {}),
      },
      select: { id: true },
    });

    const directReportIds = directReports.map((r) => r.id);

    if (directReportIds.length === 0) {
      return [];
    }

    // Get all pending approval steps and filter to those from direct reports
    const allPendingSteps = await prisma.approvalStep.findMany({
      where: baseWhere,
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to only include steps that are the current pending step for their entity
    // and where the requester is a direct report
    const stepsByEntity = new Map<string, ApprovalStepWithApprover[]>();
    for (const step of allPendingSteps) {
      const key = `${step.entityType}:${step.entityId}`;
      if (!stepsByEntity.has(key)) {
        stepsByEntity.set(key, []);
      }
      stepsByEntity.get(key)!.push(step);
    }

    const result: ApprovalStepWithApprover[] = [];
    for (const steps of stepsByEntity.values()) {
      // Get the step with lowest levelOrder (current step)
      const currentStep = steps.reduce((min, step) =>
        step.levelOrder < min.levelOrder ? step : min
      );
      result.push(currentStep);
    }

    return result;
  }

  // Member has no approval permissions
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an entity has any approval chain initialized.
 */
export async function hasApprovalChain(
  entityType: ApprovalModule,
  entityId: string
): Promise<boolean> {
  const count = await prisma.approvalStep.count({
    where: { entityType, entityId },
  });
  return count > 0;
}

/**
 * Check if all steps in an entity's approval chain are approved.
 */
export async function isFullyApproved(
  entityType: ApprovalModule,
  entityId: string
): Promise<boolean> {
  const steps = await prisma.approvalStep.findMany({
    where: { entityType, entityId },
    select: { status: true },
  });

  if (steps.length === 0) return false;

  return steps.every((step) => step.status === 'APPROVED');
}

/**
 * Check if any step in an entity's approval chain was rejected.
 */
export async function wasRejected(
  entityType: ApprovalModule,
  entityId: string
): Promise<boolean> {
  const rejectedCount = await prisma.approvalStep.count({
    where: {
      entityType,
      entityId,
      status: 'REJECTED',
    },
  });
  return rejectedCount > 0;
}

/**
 * Delete all approval steps for an entity (e.g., if request is cancelled).
 */
export async function deleteApprovalChain(
  entityType: ApprovalModule,
  entityId: string
): Promise<void> {
  await prisma.approvalStep.deleteMany({
    where: { entityType, entityId },
  });
}

/**
 * Get approval chain summary for display.
 */
export async function getApprovalChainSummary(
  entityType: ApprovalModule,
  entityId: string
): Promise<{
  totalSteps: number;
  completedSteps: number;
  currentStep: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
}> {
  const steps = await prisma.approvalStep.findMany({
    where: { entityType, entityId },
    orderBy: { levelOrder: 'asc' },
  });

  if (steps.length === 0) {
    return {
      totalSteps: 0,
      completedSteps: 0,
      currentStep: null,
      status: 'NOT_STARTED',
    };
  }

  const completedSteps = steps.filter(
    (s) => s.status === 'APPROVED' || s.status === 'REJECTED' || s.status === 'SKIPPED'
  ).length;

  const rejectedStep = steps.find((s) => s.status === 'REJECTED');
  if (rejectedStep) {
    return {
      totalSteps: steps.length,
      completedSteps,
      currentStep: rejectedStep.levelOrder,
      status: 'REJECTED',
    };
  }

  const pendingStep = steps.find((s) => s.status === 'PENDING');
  if (!pendingStep) {
    return {
      totalSteps: steps.length,
      completedSteps,
      currentStep: null,
      status: 'APPROVED',
    };
  }

  return {
    totalSteps: steps.length,
    completedSteps: steps.filter((s) => s.status === 'APPROVED').length,
    currentStep: pendingStep.levelOrder,
    status: 'PENDING',
  };
}
