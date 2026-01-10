/**
 * @file workflow-schemas.ts
 * @description Validation schemas for workflow actions (approve, reject, etc.)
 *              Used across approval routes for leave, purchase requests, suppliers, etc.
 * @module validations
 */

import { z } from 'zod';

/**
 * Schema for approval actions (approve with optional notes)
 */
export const approvalSchema = z.object({
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

export type ApprovalInput = z.infer<typeof approvalSchema>;

/**
 * Schema for rejection actions (reject with required reason)
 */
export const rejectionSchema = z.object({
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be 500 characters or less'),
});

export type RejectionInput = z.infer<typeof rejectionSchema>;

/**
 * Schema for cancellation actions
 */
export const cancellationSchema = z.object({
  reason: z
    .string()
    .max(500, 'Reason must be 500 characters or less')
    .optional(),
});

export type CancellationInput = z.infer<typeof cancellationSchema>;

/**
 * Schema for status change with notes
 */
export const statusChangeSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  effectiveDate: z.coerce.date().optional(),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

/**
 * Schema for delegation actions
 */
export const delegationSchema = z.object({
  delegateToId: z.string().min(1, 'Delegate user is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
});

export type DelegationInput = z.infer<typeof delegationSchema>;

/**
 * Schema for assignment actions
 */
export const assignmentSchema = z.object({
  assigneeId: z.string().min(1, 'Assignee is required'),
  notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  notifyAssignee: z.boolean().default(true),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;

/**
 * Schema for escalation actions
 */
export const escalationSchema = z.object({
  escalateToId: z.string().min(1, 'Escalation target is required'),
  reason: z.string().min(1, 'Escalation reason is required').max(500),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('high'),
});

export type EscalationInput = z.infer<typeof escalationSchema>;

/**
 * Schema for comment/note addition
 */
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be 2000 characters or less'),
  isInternal: z.boolean().default(false),
});

export type CommentInput = z.infer<typeof commentSchema>;

/**
 * Schema for return/resubmit actions
 */
export const returnSchema = z.object({
  reason: z
    .string()
    .min(1, 'Reason for return is required')
    .max(500, 'Reason must be 500 characters or less'),
  requiresCorrection: z.boolean().default(true),
});

export type ReturnInput = z.infer<typeof returnSchema>;

/**
 * Create a status transition schema with allowed statuses
 */
export function createStatusTransitionSchema<T extends string>(
  allowedStatuses: readonly [T, ...T[]]
) {
  return z.object({
    status: z.enum(allowedStatuses),
    notes: z.string().max(500).optional(),
  });
}

/**
 * Validate that status transition is allowed
 */
export function validateStatusTransition<T extends string>(
  currentStatus: T,
  newStatus: T,
  allowedTransitions: Record<T, readonly T[]>
): { valid: boolean; error?: string } {
  const allowed = allowedTransitions[currentStatus];

  if (!allowed) {
    return {
      valid: false,
      error: `No transitions allowed from status: ${currentStatus}`,
    };
  }

  if (!allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}
