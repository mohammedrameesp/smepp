/**
 * @file workflow-schemas.ts
 * @description Validation schemas for workflow actions including approval, rejection,
 *              and cancellation. Used across all approval routes for consistent validation
 *              of workflow state transitions.
 * @module validations
 *
 * @example
 * ```typescript
 * import { approvalSchema, rejectionSchema, cancellationSchema } from '@/lib/validations/workflow-schemas';
 *
 * // In an approval API route
 * const { notes } = approvalSchema.parse(req.body);
 *
 * // In a rejection API route (reason is required)
 * const { reason } = rejectionSchema.parse(req.body);
 *
 * // In a cancellation API route
 * const { reason } = cancellationSchema.parse(req.body);
 * ```
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum length for notes and reason fields.
 * Consistent across all workflow schemas to ensure database compatibility.
 */
const MAX_NOTES_LENGTH = 500;

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for approval actions.
 *
 * Used when an approver approves a request (leave, spend request, asset request, etc.).
 * Notes are optional since approval is a positive action that doesn't require justification.
 *
 * @property notes - Optional notes from the approver (max 500 characters)
 *
 * @example
 * ```typescript
 * // Approval without notes
 * approvalSchema.parse({});
 *
 * // Approval with notes
 * approvalSchema.parse({ notes: 'Approved for Q1 budget' });
 *
 * // Invalid - notes too long
 * approvalSchema.parse({ notes: 'a'.repeat(501) }); // Throws
 * ```
 */
export const approvalSchema = z.object({
  /**
   * Optional notes from the approver.
   * Can be used to provide context or conditions for the approval.
   */
  notes: z
    .string()
    .max(MAX_NOTES_LENGTH, `Notes must be ${MAX_NOTES_LENGTH} characters or less`)
    .optional(),
});

/** Input type for approval actions */
export type ApprovalInput = z.infer<typeof approvalSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// REJECTION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for rejection actions.
 *
 * Used when an approver rejects a request. Unlike approval, rejection
 * REQUIRES a reason to ensure the requester understands why their
 * request was denied and can take appropriate action.
 *
 * @property reason - Required reason for rejection (1-500 characters)
 *
 * @example
 * ```typescript
 * // Valid rejection
 * rejectionSchema.parse({ reason: 'Budget exceeded for this quarter' });
 *
 * // Invalid - missing reason
 * rejectionSchema.parse({}); // Throws: Reason is required
 *
 * // Invalid - empty reason
 * rejectionSchema.parse({ reason: '' }); // Throws: Reason is required
 * ```
 */
export const rejectionSchema = z.object({
  /**
   * Required reason explaining why the request was rejected.
   * This helps the requester understand the decision and take corrective action.
   */
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(MAX_NOTES_LENGTH, `Reason must be ${MAX_NOTES_LENGTH} characters or less`),
});

/** Input type for rejection actions */
export type RejectionInput = z.infer<typeof rejectionSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// CANCELLATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for cancellation actions.
 *
 * Used when a requester cancels their own request or an admin cancels
 * on their behalf. Reason is optional since the requester may simply
 * no longer need the request fulfilled.
 *
 * @property reason - Optional reason for cancellation (max 500 characters)
 *
 * @example
 * ```typescript
 * // Cancellation without reason
 * cancellationSchema.parse({});
 *
 * // Cancellation with reason
 * cancellationSchema.parse({ reason: 'No longer needed - project cancelled' });
 * ```
 */
export const cancellationSchema = z.object({
  /**
   * Optional reason for the cancellation.
   * Useful for record-keeping and understanding request patterns.
   */
  reason: z
    .string()
    .max(MAX_NOTES_LENGTH, `Reason must be ${MAX_NOTES_LENGTH} characters or less`)
    .optional(),
});

/** Input type for cancellation actions */
export type CancellationInput = z.infer<typeof cancellationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Union type for all workflow action inputs.
 * Useful when handling multiple action types in a single function.
 */
export type WorkflowActionInput = ApprovalInput | RejectionInput | CancellationInput;

/**
 * Workflow action types as a const array.
 * Useful for generating enums or switch statements.
 */
export const WORKFLOW_ACTIONS = ['approve', 'reject', 'cancel'] as const;

/** Type for workflow action names */
export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];
