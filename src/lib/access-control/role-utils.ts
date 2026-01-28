/**
 * @file role-utils.ts
 * @module access-control
 * @description Role Utilities for Access Control System.
 *
 * Provides utility functions for deriving roles from boolean permission flags.
 * Centralizes the role derivation logic that was previously duplicated across 30+ files.
 *
 * Two-tier role system:
 * 1. OrgRole (4-tier): For authorization, logging, session context
 *    - OWNER > ADMIN > MANAGER > MEMBER
 * 2. DisplayRole (7-tier): For UI display only, shows domain access
 *    - OWNER > ADMIN > MANAGER > HR > FINANCE > OPERATIONS > EMPLOYEE
 */

import { ORG_ROLES, OrgRole, DISPLAY_ROLES, DisplayRole } from './permissions';

/**
 * Flags for deriving authorization role (OrgRole)
 */
export interface OrgRoleFlags {
  isOwner?: boolean;
  isAdmin?: boolean;
}

/**
 * Flags for deriving display role (DisplayRole)
 * Includes domain access flags for UI display
 */
export interface DisplayRoleFlags extends OrgRoleFlags {
  isManager?: boolean;
  canApprove?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  hasOperationsAccess?: boolean;
}

/**
 * Derive authorization role (4-tier) from boolean flags.
 *
 * Used for:
 * - API authorization checks
 * - Error logging
 * - Session context
 *
 * @param flags - Object containing isOwner and isAdmin boolean flags
 * @returns The derived OrgRole ('OWNER', 'ADMIN', or 'MEMBER')
 *
 * @example
 * ```typescript
 * deriveOrgRole({ isOwner: true }) // => 'OWNER'
 * deriveOrgRole({ isAdmin: true }) // => 'ADMIN'
 * deriveOrgRole({}) // => 'MEMBER'
 * ```
 */
export function deriveOrgRole(flags: OrgRoleFlags): OrgRole {
  if (flags.isOwner) return ORG_ROLES.OWNER;
  if (flags.isAdmin) return ORG_ROLES.ADMIN;
  return ORG_ROLES.MEMBER;
}

/**
 * Derive display role (7-tier) from boolean flags.
 *
 * Used only for UI display in access-control pages.
 * Priority order: OWNER > ADMIN > MANAGER > HR > FINANCE > OPERATIONS > EMPLOYEE
 *
 * @param flags - Object containing role and domain access boolean flags
 * @returns The derived DisplayRole for UI presentation
 *
 * @example
 * ```typescript
 * deriveDisplayRole({ isOwner: true }) // => 'OWNER'
 * deriveDisplayRole({ hasHRAccess: true }) // => 'HR'
 * deriveDisplayRole({}) // => 'EMPLOYEE'
 * ```
 */
export function deriveDisplayRole(flags: DisplayRoleFlags): DisplayRole {
  if (flags.isOwner) return DISPLAY_ROLES.OWNER;
  if (flags.isAdmin) return DISPLAY_ROLES.ADMIN;
  if (flags.isManager || flags.canApprove) return DISPLAY_ROLES.MANAGER;
  if (flags.hasHRAccess) return DISPLAY_ROLES.HR;
  if (flags.hasFinanceAccess) return DISPLAY_ROLES.FINANCE;
  if (flags.hasOperationsAccess) return DISPLAY_ROLES.OPERATIONS;
  return DISPLAY_ROLES.EMPLOYEE;
}

/**
 * Check if user is admin or owner.
 *
 * @param flags - Object containing isOwner and isAdmin boolean flags
 * @returns True if user is owner or admin
 */
export function isAdminOrOwner(flags: OrgRoleFlags): boolean {
  return !!(flags.isOwner || flags.isAdmin);
}

/**
 * Check if user has elevated privileges (admin, owner, or manager).
 *
 * @param flags - Object containing isOwner, isAdmin, and optionally isManager flags
 * @returns True if user has any elevated role
 */
export function hasElevatedPrivileges(flags: OrgRoleFlags & { isManager?: boolean }): boolean {
  return !!(flags.isOwner || flags.isAdmin || flags.isManager);
}
