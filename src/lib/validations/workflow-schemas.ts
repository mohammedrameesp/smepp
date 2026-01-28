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
