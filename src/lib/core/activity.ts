/**
 * @file activity.ts
 * @description Activity logging service for audit trail - tracks user actions
 *              across all entities for compliance, debugging, and analytics.
 *
 *              This service is intentionally non-blocking: logging failures are
 *              caught and logged but never thrown, ensuring main operations
 *              are not affected by audit trail issues.
 *
 * @module lib/core
 *
 * @example
 * // Log a simple action
 * await logAction(tenantId, userId, ActivityActions.ASSET_CREATED, 'Asset', assetId);
 *
 * @example
 * // Log with payload for detailed audit trail
 * await logAction(
 *   tenantId,
 *   userId,
 *   ActivityActions.ASSET_UPDATED,
 *   'Asset',
 *   assetId,
 *   { changes: { status: { from: 'AVAILABLE', to: 'IN_USE' } } }
 * );
 *
 * @see {@link ActivityLog} Prisma model in schema.prisma
 */

import type { ActivityLog } from '@prisma/client';

import { prisma } from './prisma';
import logger from './log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload structure for activity logs.
 * Contains optional change tracking and metadata fields.
 */
export interface ActivityPayload {
  /** Field-level changes: { fieldName: { from: oldValue, to: newValue } } */
  changes?: Record<string, { from: unknown; to: unknown }>;
  /** Additional context about the action */
  reason?: string;
  /** Related entity references */
  relatedEntities?: Array<{ type: string; id: string }>;
  /** Any additional metadata */
  [key: string]: unknown;
}

/**
 * Entity types that can be logged in the activity trail.
 * Used for consistent entityType values across the application.
 */
export type EntityType =
  | 'Asset'
  | 'AssetCategory'
  | 'AssetTypeMapping'
  | 'AssetRequest'
  | 'AssetAssignment'
  | 'Subscription'
  | 'Supplier'
  | 'TeamMember'
  | 'SpendRequest'
  | 'LeaveType'
  | 'LeaveRequest'
  | 'LeaveBalance'
  | 'SalaryStructure'
  | 'PayrollRun'
  | 'Payslip'
  | 'Loan'
  | 'CompanyDocument'
  | 'ApprovalPolicy'
  | 'ApprovalStep'
  | 'Module'
  | 'Organization'
  | 'CustomDomain';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY ACTIONS - Grouped by Domain
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standardized action constants for activity logging.
 * Grouped by domain for easier navigation and maintenance.
 *
 * @example
 * import { ActivityActions } from '@/lib/core/activity';
 * await logAction(tenantId, memberId, ActivityActions.ASSET_CREATED, 'Asset', id);
 */
export const ActivityActions = {
  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATIONS: Assets
  // ─────────────────────────────────────────────────────────────────────────────
  ASSET_CREATED: 'ASSET_CREATED',
  ASSET_UPDATED: 'ASSET_UPDATED',
  ASSET_DELETED: 'ASSET_DELETED',
  ASSET_ASSIGNED: 'ASSET_ASSIGNED',

  ASSET_CATEGORY_CREATED: 'ASSET_CATEGORY_CREATED',
  ASSET_CATEGORY_UPDATED: 'ASSET_CATEGORY_UPDATED',
  ASSET_CATEGORY_DELETED: 'ASSET_CATEGORY_DELETED',

  ASSET_TYPE_MAPPING_CREATED: 'ASSET_TYPE_MAPPING_CREATED',
  ASSET_TYPE_MAPPING_UPDATED: 'ASSET_TYPE_MAPPING_UPDATED',
  ASSET_TYPE_MAPPING_DELETED: 'ASSET_TYPE_MAPPING_DELETED',

  ASSET_REQUEST_CREATED: 'ASSET_REQUEST_CREATED',
  ASSET_REQUEST_APPROVED: 'ASSET_REQUEST_APPROVED',
  ASSET_REQUEST_REJECTED: 'ASSET_REQUEST_REJECTED',
  ASSET_REQUEST_CANCELLED: 'ASSET_REQUEST_CANCELLED',

  ASSET_ASSIGNMENT_CREATED: 'ASSET_ASSIGNMENT_CREATED',
  ASSET_ASSIGNMENT_ACCEPTED: 'ASSET_ASSIGNMENT_ACCEPTED',
  ASSET_ASSIGNMENT_DECLINED: 'ASSET_ASSIGNMENT_DECLINED',

  ASSET_RETURN_REQUESTED: 'ASSET_RETURN_REQUESTED',
  ASSET_RETURN_APPROVED: 'ASSET_RETURN_APPROVED',
  ASSET_RETURN_REJECTED: 'ASSET_RETURN_REJECTED',

  ASSET_DEPRECIATION_CATEGORY_ASSIGNED: 'DEPRECIATION_CATEGORY_ASSIGNED',

  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATIONS: Subscriptions
  // ─────────────────────────────────────────────────────────────────────────────
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_DELETED: 'SUBSCRIPTION_DELETED',

  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATIONS: Suppliers
  // ─────────────────────────────────────────────────────────────────────────────
  SUPPLIER_CREATED: 'SUPPLIER_CREATED',
  SUPPLIER_UPDATED: 'SUPPLIER_UPDATED',
  SUPPLIER_DELETED: 'SUPPLIER_DELETED',
  SUPPLIER_APPROVED: 'SUPPLIER_APPROVED',
  SUPPLIER_REJECTED: 'SUPPLIER_REJECTED',
  SUPPLIER_REGISTERED: 'SUPPLIER_REGISTERED',
  SUPPLIER_ENGAGEMENT_ADDED: 'SUPPLIER_ENGAGEMENT_ADDED',

  // ─────────────────────────────────────────────────────────────────────────────
  // OPERATIONS: Spend Requests
  // ─────────────────────────────────────────────────────────────────────────────
  SPEND_REQUEST_CREATED: 'SPEND_REQUEST_CREATED',
  SPEND_REQUEST_UPDATED: 'SPEND_REQUEST_UPDATED',
  SPEND_REQUEST_DELETED: 'SPEND_REQUEST_DELETED',
  SPEND_REQUEST_STATUS_CHANGED: 'SPEND_REQUEST_STATUS_CHANGED',
  SPEND_REQUEST_APPROVED: 'SPEND_REQUEST_APPROVED',
  SPEND_REQUEST_REJECTED: 'SPEND_REQUEST_REJECTED',
  SPEND_REQUEST_COMPLETED: 'SPEND_REQUEST_COMPLETED',

  // ─────────────────────────────────────────────────────────────────────────────
  // HR: Employees
  // ─────────────────────────────────────────────────────────────────────────────
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_OFFBOARDED: 'USER_OFFBOARDED',
  USER_OFFBOARDING_CANCELLED: 'USER_OFFBOARDING_CANCELLED',

  // ─────────────────────────────────────────────────────────────────────────────
  // HR: Leave Management
  // ─────────────────────────────────────────────────────────────────────────────
  LEAVE_TYPE_CREATED: 'LEAVE_TYPE_CREATED',
  LEAVE_TYPE_UPDATED: 'LEAVE_TYPE_UPDATED',
  LEAVE_TYPE_DELETED: 'LEAVE_TYPE_DELETED',

  LEAVE_REQUEST_CREATED: 'LEAVE_REQUEST_CREATED',
  LEAVE_REQUEST_UPDATED: 'LEAVE_REQUEST_UPDATED',
  LEAVE_REQUEST_DELETED: 'LEAVE_REQUEST_DELETED',
  LEAVE_REQUEST_APPROVED: 'LEAVE_REQUEST_APPROVED',
  LEAVE_REQUEST_REJECTED: 'LEAVE_REQUEST_REJECTED',
  LEAVE_REQUEST_CANCELLED: 'LEAVE_REQUEST_CANCELLED',

  LEAVE_BALANCE_CREATED: 'LEAVE_BALANCE_CREATED',
  LEAVE_BALANCE_ADJUSTED: 'LEAVE_BALANCE_ADJUSTED',

  // ─────────────────────────────────────────────────────────────────────────────
  // HR: Payroll
  // ─────────────────────────────────────────────────────────────────────────────
  SALARY_STRUCTURE_CREATED: 'SALARY_STRUCTURE_CREATED',
  SALARY_STRUCTURE_UPDATED: 'SALARY_STRUCTURE_UPDATED',
  SALARY_STRUCTURE_DEACTIVATED: 'SALARY_STRUCTURE_DEACTIVATED',

  PAYROLL_RUN_CREATED: 'PAYROLL_RUN_CREATED',
  PAYROLL_RUN_SUBMITTED: 'PAYROLL_RUN_SUBMITTED',
  PAYROLL_RUN_APPROVED: 'PAYROLL_RUN_APPROVED',
  PAYROLL_RUN_REJECTED: 'PAYROLL_RUN_REJECTED',
  PAYROLL_RUN_PROCESSED: 'PAYROLL_RUN_PROCESSED',
  PAYROLL_RUN_PAID: 'PAYROLL_RUN_PAID',
  PAYROLL_RUN_CANCELLED: 'PAYROLL_RUN_CANCELLED',
  PAYROLL_WPS_GENERATED: 'PAYROLL_WPS_GENERATED',

  PAYSLIP_CREATED: 'PAYSLIP_CREATED',
  PAYSLIP_UPDATED: 'PAYSLIP_UPDATED',

  // ─────────────────────────────────────────────────────────────────────────────
  // HR: Loans
  // ─────────────────────────────────────────────────────────────────────────────
  LOAN_CREATED: 'LOAN_CREATED',
  LOAN_UPDATED: 'LOAN_UPDATED',
  LOAN_APPROVED: 'LOAN_APPROVED',
  LOAN_PAUSED: 'LOAN_PAUSED',
  LOAN_RESUMED: 'LOAN_RESUMED',
  LOAN_COMPLETED: 'LOAN_COMPLETED',
  LOAN_WRITTEN_OFF: 'LOAN_WRITTEN_OFF',
  LOAN_REPAYMENT_RECORDED: 'LOAN_REPAYMENT_RECORDED',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM: Alerts
  // ─────────────────────────────────────────────────────────────────────────────
  ALERT_SUBSCRIPTION_RENEWAL: 'ALERT_SUBSCRIPTION_RENEWAL',
  ALERT_WARRANTY_EXPIRY: 'ALERT_WARRANTY_EXPIRY',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM: Documents
  // ─────────────────────────────────────────────────────────────────────────────
  COMPANY_DOCUMENT_CREATED: 'COMPANY_DOCUMENT_CREATED',
  COMPANY_DOCUMENT_UPDATED: 'COMPANY_DOCUMENT_UPDATED',
  COMPANY_DOCUMENT_DELETED: 'COMPANY_DOCUMENT_DELETED',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM: Approvals
  // ─────────────────────────────────────────────────────────────────────────────
  APPROVAL_POLICY_CREATED: 'APPROVAL_POLICY_CREATED',
  APPROVAL_POLICY_UPDATED: 'APPROVAL_POLICY_UPDATED',
  APPROVAL_POLICY_DELETED: 'APPROVAL_POLICY_DELETED',

  APPROVAL_STEP_APPROVED: 'APPROVAL_STEP_APPROVED',
  APPROVAL_STEP_REJECTED: 'APPROVAL_STEP_REJECTED',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM: Security & Audit
  // ─────────────────────────────────────────────────────────────────────────────
  /** @security Super admin impersonation - requires audit trail */
  SECURITY_IMPERSONATION_STARTED: 'SECURITY_IMPERSONATION_STARTED',
  SECURITY_IMPERSONATION_ENDED: 'SECURITY_IMPERSONATION_ENDED',
  SECURITY_IMPERSONATION_REVOKED: 'SECURITY_IMPERSONATION_REVOKED',
  SECURITY_IMPERSONATION_BLOCKED: 'SECURITY_IMPERSONATION_BLOCKED',

  // ─────────────────────────────────────────────────────────────────────────────
  // SYSTEM: Configuration
  // ─────────────────────────────────────────────────────────────────────────────
  MODULE_INSTALLED: 'MODULE_INSTALLED',
  MODULE_UNINSTALLED: 'MODULE_UNINSTALLED',

  /** @security Data export - compliance audit trail */
  DATA_EXPORTED: 'DATA_EXPORTED',
  DATA_IMPORTED: 'DATA_IMPORTED',

  /** File upload tracking */
  FILE_UPLOADED: 'UPLOAD_FILE',

  CUSTOM_DOMAIN_ADDED: 'CUSTOM_DOMAIN_ADDED',
  CUSTOM_DOMAIN_REMOVED: 'CUSTOM_DOMAIN_REMOVED',
  CUSTOM_DOMAIN_VERIFIED: 'CUSTOM_DOMAIN_VERIFIED',
  CUSTOM_DOMAIN_VERIFICATION_FAILED: 'CUSTOM_DOMAIN_VERIFICATION_FAILED',
} as const;

/** Union type of all valid activity action strings */
export type ActivityAction = (typeof ActivityActions)[keyof typeof ActivityActions];

// ═══════════════════════════════════════════════════════════════════════════════
// CORE LOGGING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Log an activity for audit trail purposes.
 *
 * This function is intentionally non-blocking - failures are logged but never thrown,
 * ensuring that activity logging issues don't break main application operations.
 *
 * @param tenantId - Organization ID for tenant isolation (required)
 * @param actorMemberId - Team member ID who performed the action (null for system actions)
 * @param action - The action type (prefer ActivityActions constants, string allowed for dynamic handlers)
 * @param entityType - Type of entity being acted upon (e.g., 'Asset', 'LeaveRequest')
 * @param entityId - ID of the specific entity
 * @param payload - Additional data to store with the activity (changes, context, etc.)
 *
 * @returns The created ActivityLog record, or null if logging failed
 *
 * @example
 * // Basic usage
 * await logAction(tenantId, memberId, ActivityActions.ASSET_CREATED, 'Asset', asset.id);
 *
 * @example
 * // With change tracking payload
 * await logAction(tenantId, memberId, ActivityActions.ASSET_UPDATED, 'Asset', asset.id, {
 *   changes: {
 *     status: { from: 'AVAILABLE', to: 'IN_USE' },
 *     assignedMemberId: { from: null, to: 'member_123' }
 *   }
 * });
 *
 * @example
 * // System action (no actor)
 * await logAction(tenantId, null, ActivityActions.ALERT_WARRANTY_EXPIRY, 'Asset', asset.id, {
 *   reason: 'Warranty expires in 30 days'
 * });
 *
 * @security
 * - Uses raw prisma client intentionally (audit logs must work even when tenant context fails)
 * - Payload is serialized to remove non-JSON-safe values
 * - Sensitive data should be excluded from payload before calling
 */
export async function logAction(
  tenantId: string,
  actorMemberId: string | null,
  action: ActivityAction | string,
  entityType?: EntityType | string,
  entityId?: string,
  payload?: ActivityPayload | Record<string, unknown>
): Promise<ActivityLog | null> {
  // Validate tenant ID - this is a critical multi-tenancy requirement
  if (!tenantId) {
    logger.error(
      { action, entityType, entityId },
      'logAction called without tenantId - multi-tenancy violation'
    );
    return null;
  }

  try {
    // Note: Using raw prisma intentionally - audit logs must work even when
    // tenant-scoped client fails (e.g., during error recovery scenarios)
    const activity = await prisma.activityLog.create({
      data: {
        tenantId,
        actorMemberId,
        action,
        entityType,
        entityId,
        // Serialize payload to ensure JSON-safe values only
        payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
      },
    });

    return activity;
  } catch (error) {
    // Log failure but don't throw - activity logging should never break main operations
    logger.error(
      {
        tenantId,
        action,
        entityType,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Failed to log activity'
    );
    return null;
  }
}
