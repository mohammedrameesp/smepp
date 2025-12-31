/**
 * @file approval-utils.ts
 * @description Shared utilities for approval workflow operations
 * @module core
 *
 * This module consolidates common approval patterns used across:
 * - Leave request approvals/rejections
 * - Asset request approvals/rejections
 * - Supplier approvals/rejections
 * - Purchase request status changes
 *
 * Provides reusable helpers for status validation, history tracking,
 * and notification sending.
 */

import { NextResponse } from 'next/server';
import { logAction } from '@/lib/activity';
import { createNotification } from '@/lib/domains/system/notifications';
import { invalidateTokensForEntity, type ApprovalEntityType } from '@/lib/whatsapp';
import { PrismaClient } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context required for approval operations
 */
export interface ApprovalContext {
  /** Tenant/organization ID */
  tenantId: string;
  /** User performing the approval action */
  userId: string;
  /** User's name for logging */
  userName?: string;
  /** User's email for logging */
  userEmail?: string;
}

/**
 * Result of an approval operation
 */
export interface ApprovalResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

/**
 * Configuration for status transitions
 */
export interface StatusTransition {
  /** Statuses that allow the transition */
  allowedFrom: string[];
  /** Target status after transition */
  targetStatus: string;
  /** Action name for history/logging */
  action: string;
}

/**
 * History entry for tracking status changes
 */
export interface ApprovalHistoryEntry {
  entityId: string;
  action: string;
  oldStatus: string;
  newStatus: string;
  notes?: string;
  performedById: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that an entity can transition to a new status
 *
 * @param currentStatus - Current status of the entity
 * @param allowedStatuses - Statuses that allow this transition
 * @param errorMessage - Custom error message if validation fails
 * @returns Validation result or error response
 *
 * @example
 * const validation = validateStatusTransition('PENDING', ['PENDING'], 'Only pending requests can be approved');
 * if ('error' in validation) return validation.error;
 */
export function validateStatusTransition(
  currentStatus: string,
  allowedStatuses: string[],
  errorMessage?: string
): { valid: true } | { error: NextResponse } {
  if (!allowedStatuses.includes(currentStatus)) {
    return {
      error: NextResponse.json(
        { error: errorMessage || `Invalid status transition from ${currentStatus}` },
        { status: 400 }
      ),
    };
  }

  return { valid: true };
}

/**
 * Standard status transitions for approval workflows
 */
export const APPROVAL_TRANSITIONS = {
  /** Approve a pending item */
  APPROVE: {
    allowedFrom: ['PENDING'],
    targetStatus: 'APPROVED',
    action: 'APPROVED',
  },
  /** Reject a pending item */
  REJECT: {
    allowedFrom: ['PENDING'],
    targetStatus: 'REJECTED',
    action: 'REJECTED',
  },
  /** Cancel an approved or pending item */
  CANCEL: {
    allowedFrom: ['PENDING', 'APPROVED'],
    targetStatus: 'CANCELLED',
    action: 'CANCELLED',
  },
} as const;

/**
 * Checks if an entity exists within a tenant
 * Returns standardized 404 error if not found
 *
 * @param entity - The entity to check
 * @param entityName - Human-readable entity name for error message
 * @returns Validation result or error response
 *
 * @example
 * const validation = validateEntityExists(leaveRequest, 'Leave request');
 * if ('error' in validation) return validation.error;
 */
export function validateEntityExists<T>(
  entity: T | null,
  entityName: string
): { valid: true; entity: T } | { error: NextResponse } {
  if (!entity) {
    return {
      error: NextResponse.json(
        { error: `${entityName} not found` },
        { status: 404 }
      ),
    };
  }

  return { valid: true, entity };
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a standard history entry object
 * Use within Prisma transactions to track status changes
 *
 * @param entry - History entry details
 * @returns Formatted history entry data
 *
 * @example
 * await tx.leaveRequestHistory.create({
 *   data: createHistoryEntry({
 *     entityId: request.id,
 *     action: 'APPROVED',
 *     oldStatus: 'PENDING',
 *     newStatus: 'APPROVED',
 *     notes: approverNotes,
 *     performedById: currentUserId,
 *   }),
 * });
 */
export function createHistoryEntry(entry: ApprovalHistoryEntry) {
  return {
    action: entry.action,
    oldStatus: entry.oldStatus,
    newStatus: entry.newStatus,
    notes: entry.notes || null,
    performedById: entry.performedById,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY LOGGING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs an approval action with standard payload format
 *
 * @param context - Approval context
 * @param action - Activity action constant
 * @param entityType - Type of entity being approved
 * @param entityId - ID of the entity
 * @param payload - Additional data for the log
 */
export async function logApprovalAction(
  context: ApprovalContext,
  action: string,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>
): Promise<void> {
  await logAction(
    context.tenantId,
    context.userId,
    action,
    entityType,
    entityId,
    payload
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends notification and handles errors silently
 * Notifications are fire-and-forget - failures shouldn't block the approval
 *
 * @param notification - Notification template result
 * @param tenantId - Tenant ID for the notification
 */
export async function sendApprovalNotification(
  notification: Parameters<typeof createNotification>[0],
  tenantId: string
): Promise<void> {
  try {
    await createNotification(notification, tenantId);
  } catch (error) {
    // Log but don't fail the approval
    console.error('[Notification] Failed to send approval notification:', error);
  }
}

/**
 * Invalidates WhatsApp action tokens for an approved/rejected entity
 * This prevents stale action buttons from working after a decision is made
 *
 * @param entityType - Type of entity
 * @param entityId - ID of the entity
 */
export async function invalidateApprovalTokens(
  entityType: ApprovalEntityType,
  entityId: string
): Promise<void> {
  try {
    await invalidateTokensForEntity(entityType, entityId);
  } catch (error) {
    // Log but don't fail the approval
    console.error('[WhatsApp] Failed to invalidate tokens:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard approval transaction result type
 */
export interface ApprovalTransactionResult<T> {
  entity: T;
  historyCreated: boolean;
}

/**
 * Performs a standard approval operation within a transaction
 *
 * @param tx - Prisma transaction client
 * @param config - Approval configuration
 * @returns Updated entity and history status
 *
 * @example
 * const result = await prisma.$transaction(async (tx) => {
 *   return performApproval(tx, {
 *     model: 'leaveRequest',
 *     id: requestId,
 *     updateData: { status: 'APPROVED', approverId: userId },
 *     historyModel: 'leaveRequestHistory',
 *     historyData: { leaveRequestId: requestId, action: 'APPROVED', ... },
 *   });
 * });
 */
export async function performApproval<T>(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  config: {
    /** Prisma model name to update */
    model: string;
    /** Entity ID */
    id: string;
    /** Data to update on the entity */
    updateData: Record<string, unknown>;
    /** Related data to include in response */
    include?: Record<string, unknown>;
    /** History model name (optional) */
    historyModel?: string;
    /** History data to create (optional) */
    historyData?: Record<string, unknown>;
  }
): Promise<ApprovalTransactionResult<T>> {
  const { model, id, updateData, include, historyModel, historyData } = config;

  // Update the main entity
  // @ts-expect-error - Dynamic model access
  const entity = await tx[model].update({
    where: { id },
    data: updateData,
    include,
  });

  // Create history entry if configured
  let historyCreated = false;
  if (historyModel && historyData) {
    // @ts-expect-error - Dynamic model access
    await tx[historyModel].create({
      data: historyData,
    });
    historyCreated = true;
  }

  return { entity, historyCreated };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a standard success response for approval operations
 *
 * @param entity - The approved/rejected entity
 * @param message - Optional success message
 * @returns NextResponse with entity data
 */
export function approvalSuccessResponse<T>(
  entity: T,
  message?: string
): NextResponse {
  if (message) {
    return NextResponse.json({ message, data: entity });
  }
  return NextResponse.json(entity);
}

/**
 * Creates a standard error response for approval operations
 *
 * @param error - Error message
 * @param statusCode - HTTP status code (default: 400)
 * @returns NextResponse with error
 */
export function approvalErrorResponse(
  error: string,
  statusCode: number = 400
): NextResponse {
  return NextResponse.json({ error }, { status: statusCode });
}

// ─────────────────────────────────────────────────────────────────────────────
// ID VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that an ID parameter is present
 *
 * @param id - ID parameter from route params
 * @returns Validation result or error response
 *
 * @example
 * const validation = validateIdParam(params?.id);
 * if ('error' in validation) return validation.error;
 * const { id } = validation;
 */
export function validateIdParam(
  id: string | undefined
): { id: string } | { error: NextResponse } {
  if (!id) {
    return {
      error: NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      ),
    };
  }

  return { id };
}
