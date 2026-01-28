/**
 * @file constants.ts
 * @description Client-safe constants for approvals feature.
 *              Can be imported in both client and server components.
 * @module features/approvals
 */

/**
 * Approver roles available for approval workflow configuration.
 * Used in approval policy creation/editing forms.
 */
export const APPROVER_ROLES = [
  { value: 'MANAGER', label: 'Manager' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
  { value: 'DIRECTOR', label: 'Director' },
] as const;

/** Approver role values for type checking */
export type ApproverRole = (typeof APPROVER_ROLES)[number]['value'];

/** Role values that can access approval workflows (includes ADMIN) */
export const APPROVAL_ACCESS_ROLES = ['ADMIN', ...APPROVER_ROLES.map(r => r.value)] as const;
