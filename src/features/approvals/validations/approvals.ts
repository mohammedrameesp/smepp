/**
 * @file approvals.ts
 * @description Validation schemas for multi-level approval workflows, policies, and delegations
 * @module domains/system/approvals/validations
 *
 * FEATURES:
 * - Approval Policy management (create, update, configure levels)
 * - Approval Step processing (approve, reject)
 * - Approval Delegation (delegate approval authority during absence)
 *
 * MODULES SUPPORTED:
 * - LEAVE_REQUEST: Employee leave approvals (threshold: days)
 * - PURCHASE_REQUEST: Procurement approvals (threshold: amount)
 * - ASSET_REQUEST: Asset allocation approvals (threshold: amount)
 *
 * APPROVAL ROLES:
 * - MANAGER: Direct manager approval
 * - HR_MANAGER: Human Resources approval
 * - FINANCE_MANAGER: Finance department approval
 * - DIRECTOR: Executive-level approval
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS (matching Prisma)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Modules that support multi-level approval workflows.
 */
export const approvalModuleEnum = z.enum([
  'LEAVE_REQUEST',
  'PURCHASE_REQUEST',
  'ASSET_REQUEST',
]);

/**
 * Possible states of an approval step in the workflow.
 */
export const approvalStepStatusEnum = z.enum([
  'PENDING',   // Awaiting approval
  'APPROVED',  // Approved by approver
  'REJECTED',  // Rejected by approver
  'SKIPPED',   // Skipped (e.g., when previous step rejected)
]);

/**
 * Roles that can be assigned as approvers in workflows.
 */
export const approverRoleEnum = z.enum([
  'MANAGER',         // Direct manager
  'HR_MANAGER',      // HR department head
  'FINANCE_MANAGER', // Finance department head
  'DIRECTOR',        // Executive/Director level
]);

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL POLICY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Individual approval level within a policy.
 * Defines the order and required role for each step.
 */
export const approvalLevelSchema = z.object({
  /** Order in the approval chain (1-5) */
  levelOrder: z.number().int().min(1).max(5),
  /** Role required to approve this level */
  approverRole: approverRoleEnum,
});

/**
 * Schema for creating an approval policy.
 *
 * Policies define:
 * - Which module they apply to (leave, purchase, asset)
 * - Threshold conditions (days for leave, amount for purchase/asset)
 * - Approval levels with required roles
 *
 * BUSINESS RULES:
 * - Leave requests use minDays/maxDays thresholds
 * - Purchase/Asset requests use minAmount/maxAmount thresholds
 * - Higher priority policies take precedence when multiple match
 *
 * @example
 * {
 *   name: "Large Leave Request Policy",
 *   module: "LEAVE_REQUEST",
 *   minDays: 5,
 *   maxDays: 30,
 *   levels: [
 *     { levelOrder: 1, approverRole: "MANAGER" },
 *     { levelOrder: 2, approverRole: "HR_MANAGER" }
 *   ]
 * }
 */
export const createApprovalPolicySchema = z.object({
  /** Policy display name */
  name: z.string().min(1, 'Policy name is required').max(100),
  /** Module this policy applies to */
  module: approvalModuleEnum,
  /** Whether policy is active */
  isActive: z.boolean().default(true),
  /** Minimum amount threshold (for purchase/asset) */
  minAmount: z.number().nonnegative().nullable().optional(),
  /** Maximum amount threshold (for purchase/asset) */
  maxAmount: z.number().nonnegative().nullable().optional(),
  /** Minimum days threshold (for leave) */
  minDays: z.number().int().nonnegative().nullable().optional(),
  /** Maximum days threshold (for leave) */
  maxDays: z.number().int().nonnegative().nullable().optional(),
  /** Priority for policy matching (higher = higher priority) */
  priority: z.number().int().default(0),
  /** Approval levels (1-5 levels, each with role) */
  levels: z.array(approvalLevelSchema).min(1, 'At least one approval level is required').max(5),
}).refine(
  (data) => {
    // For leave requests, days thresholds should be used
    if (data.module === 'LEAVE_REQUEST') {
      return data.minDays !== undefined || data.maxDays !== undefined;
    }
    // For purchase/asset requests, amount thresholds should be used
    if (data.module === 'PURCHASE_REQUEST' || data.module === 'ASSET_REQUEST') {
      return data.minAmount !== undefined || data.maxAmount !== undefined;
    }
    return true;
  },
  {
    message: 'Leave requests require days threshold, purchase/asset requests require amount threshold',
  }
);

/**
 * Schema for updating an existing approval policy.
 * All fields are optional.
 */
export const updateApprovalPolicySchema = z.object({
  /** Updated policy name */
  name: z.string().min(1).max(100).optional(),
  /** Update active status */
  isActive: z.boolean().optional(),
  /** Updated minimum amount */
  minAmount: z.number().nonnegative().nullable().optional(),
  /** Updated maximum amount */
  maxAmount: z.number().nonnegative().nullable().optional(),
  /** Updated minimum days */
  minDays: z.number().int().nonnegative().nullable().optional(),
  /** Updated maximum days */
  maxDays: z.number().int().nonnegative().nullable().optional(),
  /** Updated priority */
  priority: z.number().int().optional(),
  /** Updated approval levels */
  levels: z.array(approvalLevelSchema).min(1).max(5).optional(),
});

export type CreateApprovalPolicyInput = z.infer<typeof createApprovalPolicySchema>;
export type UpdateApprovalPolicyInput = z.infer<typeof updateApprovalPolicySchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL STEP SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for processing an approval action on a step.
 * Used when an approver approves or rejects a request.
 */
export const processApprovalSchema = z.object({
  /** Action to take: APPROVE or REJECT */
  action: z.enum(['APPROVE', 'REJECT']),
  /** Optional notes from the approver */
  notes: z.string().max(500).optional(),
});

export type ProcessApprovalInput = z.infer<typeof processApprovalSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// DELEGATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating an approval delegation.
 *
 * Delegations allow an approver to temporarily transfer their approval
 * authority to another user (e.g., during vacation or leave).
 *
 * @example
 * {
 *   delegateeId: "clx123...",
 *   startDate: "2024-03-01T00:00:00Z",
 *   endDate: "2024-03-15T00:00:00Z",
 *   reason: "Annual vacation"
 * }
 */
export const createDelegationSchema = z.object({
  /** ID of the user receiving delegation authority */
  delegateeId: z.string().cuid('Invalid delegatee ID'),
  /** Delegation start date (ISO datetime or Date) */
  startDate: z.string().datetime().or(z.date()),
  /** Delegation end date (ISO datetime or Date) */
  endDate: z.string().datetime().or(z.date()),
  /** Optional reason for delegation */
  reason: z.string().max(255).optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end > start;
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

/**
 * Schema for updating a delegation.
 * Can extend/shorten dates or deactivate the delegation.
 */
export const updateDelegationSchema = z.object({
  /** Updated start date */
  startDate: z.string().datetime().or(z.date()).optional(),
  /** Updated end date */
  endDate: z.string().datetime().or(z.date()).optional(),
  /** Deactivate the delegation */
  isActive: z.boolean().optional(),
  /** Updated reason */
  reason: z.string().max(255).optional(),
});

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export type UpdateDelegationInput = z.infer<typeof updateDelegationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing approval policies.
 */
export const listPoliciesQuerySchema = z.object({
  /** Filter by module type */
  module: approvalModuleEnum.optional(),
  /** Filter by active status */
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

/**
 * Query parameters for listing approval steps.
 */
export const listStepsQuerySchema = z.object({
  /** Filter by entity type/module */
  entityType: approvalModuleEnum.optional(),
  /** Filter by step status */
  status: approvalStepStatusEnum.optional(),
});

export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>;
export type ListStepsQuery = z.infer<typeof listStepsQuerySchema>;
