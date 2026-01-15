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
 * Check if someone OTHER than the requester can approve a specific role level.
 * Used to skip levels where no approver exists or where the requester is the only approver.
 *
 * Self-approval prevention: If the requester is the only person who can approve at a level,
 * that level is skipped and approval goes to the next level.
 */
async function hasApproverForRole(
  role: Role,
  tenantId: string,
  requesterId?: string
): Promise<boolean> {
  switch (role) {
    case 'MANAGER':
      // Check if the requester has a manager assigned
      if (requesterId) {
        const requester = await prisma.teamMember.findUnique({
          where: { id: requesterId },
          select: { reportingToId: true },
        });
        return !!requester?.reportingToId;
      }
      return false;

    case 'HR_MANAGER':
      // Check if anyone OTHER than the requester has HR access
      const hrCount = await prisma.teamMember.count({
        where: {
          tenantId,
          hasHRAccess: true,
          isDeleted: false,
          ...(requesterId && { id: { not: requesterId } }), // Exclude requester
        },
      });
      return hrCount > 0;

    case 'FINANCE_MANAGER':
      // Check if anyone OTHER than the requester has Finance access
      const financeCount = await prisma.teamMember.count({
        where: {
          tenantId,
          hasFinanceAccess: true,
          isDeleted: false,
          ...(requesterId && { id: { not: requesterId } }), // Exclude requester
        },
      });
      return financeCount > 0;

    case 'DIRECTOR':
      // Check if any admin/owner OTHER than the requester exists
      // isOwner is also considered as Director for approval purposes
      const adminCount = await prisma.teamMember.count({
        where: {
          tenantId,
          OR: [
            { isAdmin: true },
            { isOwner: true },
          ],
          isDeleted: false,
          ...(requesterId && { id: { not: requesterId } }), // Exclude requester
        },
      });
      return adminCount > 0;

    case 'EMPLOYEE':
      // EMPLOYEE role cannot approve
      return false;

    default:
      return false;
  }
}

/**
 * Initialize an approval chain for an entity based on a policy.
 * Creates ApprovalStep records for each level in the policy.
 *
 * Smart skipping: Levels are automatically skipped if no one can approve them.
 * - MANAGER: Skipped if requester has no reportingTo set
 * - HR_MANAGER: Skipped if no one has hasHRAccess=true
 * - FINANCE_MANAGER: Skipped if no one has hasFinanceAccess=true
 * - DIRECTOR: Never skipped (admins always exist)
 *
 * @param entityType - The type of entity (LEAVE_REQUEST, PURCHASE_REQUEST, etc.)
 * @param entityId - The ID of the entity being approved
 * @param policy - The approval policy with levels
 * @param tenantId - The tenant ID
 * @param requesterId - The ID of the team member making the request (for manager check)
 */
export async function initializeApprovalChain(
  entityType: ApprovalModule,
  entityId: string,
  policy: ApprovalPolicyWithLevels,
  tenantId?: string,
  requesterId?: string
): Promise<ApprovalStepWithApprover[]> {
  const effectiveTenantId = tenantId || 'SYSTEM';

  // Filter out levels where no one can approve
  const validLevels: typeof policy.levels = [];
  for (const level of policy.levels) {
    const hasApprover = await hasApproverForRole(
      level.approverRole,
      effectiveTenantId,
      requesterId
    );
    if (hasApprover) {
      validLevels.push(level);
    }
  }

  // If no valid levels, at least keep DIRECTOR level as fallback
  if (validLevels.length === 0) {
    validLevels.push({
      id: 'fallback',
      levelOrder: 1,
      approverRole: 'DIRECTOR',
    });
  }

  // Re-number levels sequentially (1, 2, 3...) after filtering
  const stepsData = validLevels.map((level, index) => ({
    entityType,
    entityId,
    levelOrder: index + 1,
    requiredRole: level.approverRole,
    status: 'PENDING' as ApprovalStepStatus,
    tenantId: effectiveTenantId,
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
 * Check if a member can approve a specific step based on the required role.
 *
 * Role to Permission Mapping:
 * - MANAGER: Member must be the requester's direct manager (via reportingToId)
 * - HR_MANAGER: Member must have hasHRAccess=true
 * - FINANCE_MANAGER: Member must have hasFinanceAccess=true
 * - DIRECTOR: Member must have isAdmin=true
 * - EMPLOYEE: Cannot approve (this role is for requesters only)
 *
 * Note: Admins (isAdmin=true) can approve ANY step regardless of required role.
 */
export async function canMemberApprove(
  memberId: string,
  step: ApprovalStepWithApprover,
  requesterId?: string
): Promise<{ canApprove: boolean; reason?: string }> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      isAdmin: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
      hasOperationsAccess: true,
    },
  });

  if (!member) {
    return { canApprove: false, reason: 'Member not found' };
  }

  // Admin can approve anything (bypass)
  if (member.isAdmin) {
    return { canApprove: true };
  }

  // Check based on required role
  switch (step.requiredRole) {
    case 'MANAGER':
      // Must be the requester's direct manager
      if (requesterId) {
        const requester = await prisma.teamMember.findUnique({
          where: { id: requesterId },
          select: { reportingToId: true },
        });
        if (requester?.reportingToId === member.id) {
          return { canApprove: true };
        }
      }
      return { canApprove: false, reason: 'You are not the direct manager of this employee' };

    case 'HR_MANAGER':
      if (member.hasHRAccess) {
        return { canApprove: true };
      }
      return { canApprove: false, reason: 'HR access required to approve this step' };

    case 'FINANCE_MANAGER':
      if (member.hasFinanceAccess) {
        return { canApprove: true };
      }
      return { canApprove: false, reason: 'Finance access required to approve this step' };

    case 'DIRECTOR':
      // Only admins can approve director-level steps (already handled above)
      return { canApprove: false, reason: 'Admin access required to approve this step' };

    case 'EMPLOYEE':
      // EMPLOYEE role cannot approve anything
      return { canApprove: false, reason: 'This role cannot approve requests' };

    default:
      return { canApprove: false, reason: 'Unknown approval role' };
  }
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
 * Returns steps where the member can potentially approve based on:
 * - Admin: Can see all pending approvals
 * - hasHRAccess: Can see HR_MANAGER steps
 * - hasFinanceAccess: Can see FINANCE_MANAGER steps
 * - Has direct reports: Can see MANAGER steps for their reports
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
    select: {
      id: true,
      isAdmin: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
      hasOperationsAccess: true,
    },
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

  // Build list of roles this member can approve
  const approvableRoles: Role[] = [];

  // Check if member has direct reports (can approve MANAGER steps)
  const directReportsCount = await prisma.teamMember.count({
    where: {
      reportingToId: member.id,
      ...(tenantId ? { tenantId } : {}),
    },
  });
  if (directReportsCount > 0) {
    approvableRoles.push('MANAGER');
  }

  // HR access can approve HR_MANAGER steps
  if (member.hasHRAccess) {
    approvableRoles.push('HR_MANAGER');
  }

  // Finance access can approve FINANCE_MANAGER steps
  if (member.hasFinanceAccess) {
    approvableRoles.push('FINANCE_MANAGER');
  }

  // If no approvable roles, return empty
  if (approvableRoles.length === 0) {
    return [];
  }

  // Get pending steps for roles this member can approve
  const pendingSteps = await prisma.approvalStep.findMany({
    where: {
      ...baseWhere,
      requiredRole: { in: approvableRoles },
    },
    include: {
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter to only include the current pending step for each entity
  const stepsByEntity = new Map<string, ApprovalStepWithApprover[]>();
  for (const step of pendingSteps) {
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
 * Get team members who can approve a specific role level.
 * Used for sequential notification - notify only the approvers for the current level.
 *
 * @param role - The role required for approval
 * @param tenantId - The tenant ID
 * @param requesterId - The requester's ID (needed for MANAGER role check)
 * @returns Array of team members who can approve this role
 */
export async function getApproversForRole(
  role: Role,
  tenantId: string,
  requesterId?: string
): Promise<{ id: string; email: string; name: string | null }[]> {
  switch (role) {
    case 'MANAGER':
      // Get the requester's direct manager
      if (requesterId) {
        const requester = await prisma.teamMember.findUnique({
          where: { id: requesterId },
          select: {
            reportingTo: {
              select: { id: true, email: true, name: true },
            },
          },
        });
        if (requester?.reportingTo) {
          return [requester.reportingTo];
        }
      }
      return [];

    case 'HR_MANAGER':
      // Get all team members with HR access
      return prisma.teamMember.findMany({
        where: { tenantId, hasHRAccess: true, isDeleted: false },
        select: { id: true, email: true, name: true },
      });

    case 'FINANCE_MANAGER':
      // Get all team members with Finance access
      return prisma.teamMember.findMany({
        where: { tenantId, hasFinanceAccess: true, isDeleted: false },
        select: { id: true, email: true, name: true },
      });

    case 'DIRECTOR':
      // Get all admins and owners (isOwner is also considered Director)
      return prisma.teamMember.findMany({
        where: {
          tenantId,
          OR: [
            { isAdmin: true },
            { isOwner: true },
          ],
          isDeleted: false,
        },
        select: { id: true, email: true, name: true },
      });

    default:
      return [];
  }
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
