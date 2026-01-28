/**
 * @file index.ts
 * @description Approvals feature module exports.
 *              Only exports client-safe code. Server-only code should be
 *              imported directly from './lib'.
 * @module features/approvals
 */

// Client-safe constants (can be used in client components)
export { APPROVER_ROLES, APPROVAL_ACCESS_ROLES, type ApproverRole } from './constants';

// Client components
export * from './components';
