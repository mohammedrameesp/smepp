/**
 * @file asset-request.ts
 * @description Validation schemas for asset request workflows
 * @module validations/operations
 *
 * FEATURES:
 * - Employee request validation (request to use an asset)
 * - Admin assignment validation (assign asset to user)
 * - Return request validation (user returns asset)
 * - Approval/rejection validation with required reasons
 * - Query schema for filtering and pagination
 *
 * REQUEST WORKFLOW:
 * 1. Employee Request: PENDING_ADMIN_APPROVAL → APPROVED/REJECTED → PENDING_USER_ACCEPTANCE
 * 2. Admin Assignment: PENDING_USER_ACCEPTANCE → ACCEPTED/REJECTED_BY_USER
 * 3. Return Request: PENDING_ADMIN_APPROVAL → APPROVED (asset unassigned)
 *
 * VALIDATION RULES:
 * - Reasons required for requests (audit trail)
 * - Notes optional with 1000 char limit
 * - Rejection requires explicit reason
 * - Pagination defaults: page=1, pageSize=20
 *
 * @see /api/asset-requests routes for API implementation
 */

import { z } from 'zod';
import { approvalSchema, rejectionSchema } from '@/lib/validations/workflow-schemas';
import { createQuerySchema } from '@/lib/validations/pagination-schema';
import { AssetRequestType, AssetRequestStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for employee requesting an asset.
 *
 * Used when an employee initiates a request to use a specific asset.
 * Creates a request with type EMPLOYEE_REQUEST in PENDING_ADMIN_APPROVAL status.
 *
 * @example
 * {
 *   assetId: "clx1234...",
 *   reason: "Need laptop for remote work",
 *   notes: "Preferably with 16GB RAM"
 * }
 */
export const createAssetRequestSchema = z.object({
  /** The asset being requested (required) */
  assetId: z.string().min(1, 'Asset is required'),
  /** Business justification for the request (required, max 500 chars) */
  reason: z.string().min(1, 'Please provide a reason for your request').max(500),
  /** Additional notes or preferences (optional, max 1000 chars) */
  notes: z.string().max(1000).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ASSIGNMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for admin assigning an asset to a member.
 *
 * Used when an admin proactively assigns an asset to a user.
 * Creates a request with type ADMIN_ASSIGNMENT in PENDING_USER_ACCEPTANCE status.
 *
 * @example
 * {
 *   assetId: "clx1234...",
 *   memberId: "clx5678...",
 *   reason: "New hire equipment",
 *   notes: "Setup with standard software"
 * }
 */
export const createAssetAssignmentSchema = z.object({
  /** The asset to assign (required) */
  assetId: z.string().min(1, 'Asset is required'),
  /** The team member to receive the asset (required) */
  memberId: z.string().min(1, 'Member is required'),
  /** Reason for assignment (optional, max 500 chars) */
  reason: z.string().max(500).optional().nullable(),
  /** Additional notes (optional, max 1000 chars) */
  notes: z.string().max(1000).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// RETURN REQUEST SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for user requesting to return an asset.
 *
 * Used when an employee wants to return an asset they currently have.
 * Creates a request with type RETURN_REQUEST in PENDING_ADMIN_APPROVAL status.
 *
 * @example
 * {
 *   assetId: "clx1234...",
 *   reason: "Leaving the company",
 *   notes: "Asset is in good condition"
 * }
 */
export const createReturnRequestSchema = z.object({
  /** The asset to return (required) */
  assetId: z.string().min(1, 'Asset is required'),
  /** Reason for returning (required, max 500 chars) */
  reason: z.string().min(1, 'Please provide a reason for returning the asset').max(500),
  /** Additional notes about condition, etc. (optional, max 1000 chars) */
  notes: z.string().max(1000).optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ACTION SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for admin approving a request.
 *
 * Used for approving employee requests or return requests.
 * Notes are optional for approval actions.
 */
export const approveAssetRequestSchema = z.object({
  /** Optional notes from admin (max 1000 chars) */
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Schema for admin rejecting a request.
 *
 * Reason is required for audit trail and user communication.
 * Rejection triggers email notification to the requester.
 */
export const rejectAssetRequestSchema = z.object({
  /** Explanation for rejection (required, max 500 chars) */
  reason: z.string().min(1, 'Please provide a reason for rejection').max(500),
});

// ═══════════════════════════════════════════════════════════════════════════════
// USER RESPONSE SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for user accepting an asset assignment.
 *
 * Used when user accepts an admin-assigned asset or approved request.
 * Triggers asset status change to IN_USE and creates history entry.
 */
export const acceptAssetAssignmentSchema = z.object({
  /** Optional acknowledgment notes (max 1000 chars) */
  notes: z.string().max(1000).optional().nullable(),
});

/**
 * Schema for user declining an asset assignment.
 *
 * Reason required for audit and admin notification.
 * Asset remains SPARE for reassignment to another user.
 */
export const declineAssetAssignmentSchema = z.object({
  /** Explanation for declining (required, max 500 chars) */
  reason: z.string().min(1, 'Please provide a reason for declining').max(500),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for querying/filtering asset requests.
 *
 * Supports full-text search, status/type filtering, and pagination.
 * Results can be sorted by multiple fields in ascending or descending order.
 *
 * @example
 * // GET /api/asset-requests?q=laptop&status=PENDING_ADMIN_APPROVAL&p=1&ps=20
 */
export const assetRequestQuerySchema = z.object({
  /** Full-text search across request number, asset, member */
  q: z.string().optional(),
  /** Filter by request type (EMPLOYEE_REQUEST, ADMIN_ASSIGNMENT, RETURN_REQUEST) */
  type: z.nativeEnum(AssetRequestType).optional(),
  /** Filter by request status */
  status: z.nativeEnum(AssetRequestStatus).optional(),
  /** Filter by requesting/assigned member ID */
  memberId: z.string().optional(),
  /** Filter by asset ID */
  assetId: z.string().optional(),
  /** Page number (1-indexed, default: 1) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (1-100, default: 20) */
  ps: z.coerce.number().min(1).max(100).default(20),
  /** Sort field */
  sort: z.enum(['createdAt', 'updatedAt', 'requestNumber', 'status']).default('createdAt'),
  /** Sort direction */
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Inferred type for employee asset request */
export type CreateAssetRequestData = z.infer<typeof createAssetRequestSchema>;
/** Inferred type for admin asset assignment */
export type CreateAssetAssignmentData = z.infer<typeof createAssetAssignmentSchema>;
/** Inferred type for return request */
export type CreateReturnRequestData = z.infer<typeof createReturnRequestSchema>;
/** Inferred type for approval action */
export type ApproveAssetRequestData = z.infer<typeof approveAssetRequestSchema>;
/** Inferred type for rejection action */
export type RejectAssetRequestData = z.infer<typeof rejectAssetRequestSchema>;
/** Inferred type for accept action */
export type AcceptAssetAssignmentData = z.infer<typeof acceptAssetAssignmentSchema>;
/** Inferred type for decline action */
export type DeclineAssetAssignmentData = z.infer<typeof declineAssetAssignmentSchema>;
/** Inferred type for query parameters */
export type AssetRequestQuery = z.infer<typeof assetRequestQuerySchema>;
