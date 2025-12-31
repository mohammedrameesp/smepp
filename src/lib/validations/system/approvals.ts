/**
 * @file approvals.ts
 * @description Validation schemas for multi-level approval workflows, policies, and delegations
 * @module validations/system
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS (matching Prisma)
// ═══════════════════════════════════════════════════════════════════════════════

export const approvalModuleEnum = z.enum([
  'LEAVE_REQUEST',
  'PURCHASE_REQUEST',
  'ASSET_REQUEST',
]);

export const approvalStepStatusEnum = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SKIPPED',
]);

export const approverRoleEnum = z.enum([
  'MANAGER',
  'HR_MANAGER',
  'FINANCE_MANAGER',
  'DIRECTOR',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL POLICY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const approvalLevelSchema = z.object({
  levelOrder: z.number().int().min(1).max(5),
  approverRole: approverRoleEnum,
});

export const createApprovalPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(100),
  module: approvalModuleEnum,
  isActive: z.boolean().default(true),
  minAmount: z.number().nonnegative().nullable().optional(),
  maxAmount: z.number().nonnegative().nullable().optional(),
  minDays: z.number().int().nonnegative().nullable().optional(),
  maxDays: z.number().int().nonnegative().nullable().optional(),
  priority: z.number().int().default(0),
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

export const updateApprovalPolicySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  minAmount: z.number().nonnegative().nullable().optional(),
  maxAmount: z.number().nonnegative().nullable().optional(),
  minDays: z.number().int().nonnegative().nullable().optional(),
  maxDays: z.number().int().nonnegative().nullable().optional(),
  priority: z.number().int().optional(),
  levels: z.array(approvalLevelSchema).min(1).max(5).optional(),
});

export type CreateApprovalPolicyInput = z.infer<typeof createApprovalPolicySchema>;
export type UpdateApprovalPolicyInput = z.infer<typeof updateApprovalPolicySchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL STEP SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const processApprovalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(500).optional(),
});

export type ProcessApprovalInput = z.infer<typeof processApprovalSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// DELEGATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const createDelegationSchema = z.object({
  delegateeId: z.string().cuid('Invalid delegatee ID'),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
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

export const updateDelegationSchema = z.object({
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  isActive: z.boolean().optional(),
  reason: z.string().max(255).optional(),
});

export type CreateDelegationInput = z.infer<typeof createDelegationSchema>;
export type UpdateDelegationInput = z.infer<typeof updateDelegationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

export const listPoliciesQuerySchema = z.object({
  module: approvalModuleEnum.optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

export const listStepsQuerySchema = z.object({
  entityType: approvalModuleEnum.optional(),
  status: approvalStepStatusEnum.optional(),
});

export type ListPoliciesQuery = z.infer<typeof listPoliciesQuerySchema>;
export type ListStepsQuery = z.infer<typeof listStepsQuerySchema>;
