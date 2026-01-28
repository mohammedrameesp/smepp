/**
 * @file permission-service.ts
 * @module access-control
 * @description Permission Check Service for the multi-tenant platform.
 *
 * Provides functions to check if a user has specific permissions based on:
 * - Boolean flags (isOwner, isAdmin) from session/tenant context
 * - Custom permission settings stored in RolePermission table
 * - Module enablement for the organization
 *
 * @security Permission checks are tenant-scoped. OWNER and ADMIN roles have
 * implicit access to all permissions within enabled modules.
 */

import { prisma } from '@/lib/core/prisma';
import { MODULE_PERMISSION_MAP, getAllPermissions, Permission } from './permissions';

/**
 * Core modules that are always enabled (no module restriction).
 * These are system-level modules that every organization has access to.
 */
const CORE_MODULES = ['users', 'settings', 'reports', 'activity', 'approvals', 'documents'] as const;

/**
 * Check if a user has a specific permission
 *
 * @param tenantId - The organization ID
 * @param isOwner - Whether the user is the organization owner
 * @param isAdmin - Whether the user has admin access
 * @param permission - The permission to check (e.g., "assets:view")
 * @param enabledModules - Array of enabled module slugs for the organization
 * @returns true if the user has the permission
 */
export async function hasPermission(
  tenantId: string,
  isOwner: boolean,
  isAdmin: boolean,
  permission: string,
  enabledModules: string[]
): Promise<boolean> {
  // OWNER and ADMIN have all permissions
  if (isOwner || isAdmin) {
    // Still check if the module is enabled
    return isModuleEnabledForPermission(permission, enabledModules);
  }

  // Check if the module for this permission is enabled
  if (!isModuleEnabledForPermission(permission, enabledModules)) {
    return false;
  }

  // Check custom permission for non-admin users from database
  // Uses 'MEMBER' role for backwards compatibility with existing RolePermission data
  const rolePermission = await prisma.rolePermission.findUnique({
    where: {
      tenantId_role_permission: { tenantId, role: 'MEMBER', permission },
    },
  });

  return !!rolePermission;
}

/**
 * Check multiple permissions at once (more efficient than individual checks)
 *
 * @param tenantId - The organization ID
 * @param isOwner - Whether the user is the organization owner
 * @param isAdmin - Whether the user has admin access
 * @param permissions - Array of permissions to check
 * @param enabledModules - Array of enabled module slugs
 * @returns Object mapping each permission to boolean
 */
export async function hasPermissions(
  tenantId: string,
  isOwner: boolean,
  isAdmin: boolean,
  permissions: string[],
  enabledModules: string[]
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};

  // OWNER and ADMIN have all permissions (just check modules)
  if (isOwner || isAdmin) {
    for (const permission of permissions) {
      result[permission] = isModuleEnabledForPermission(permission, enabledModules);
    }
    return result;
  }

  // Filter permissions by enabled modules first
  const moduleFilteredPermissions = permissions.filter((p) =>
    isModuleEnabledForPermission(p, enabledModules)
  );

  // Initialize all to false
  for (const permission of permissions) {
    result[permission] = false;
  }

  // Batch query for non-admin user permissions
  if (moduleFilteredPermissions.length > 0) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        tenantId,
        role: 'MEMBER',
        permission: { in: moduleFilteredPermissions },
      },
      select: { permission: true },
    });

    const grantedSet = new Set(rolePermissions.map((rp) => rp.permission));
    for (const permission of moduleFilteredPermissions) {
      result[permission] = grantedSet.has(permission);
    }
  }

  return result;
}

/**
 * Get all permissions for a user in an organization
 *
 * @param tenantId - The organization ID
 * @param isOwner - Whether the user is the organization owner
 * @param isAdmin - Whether the user has admin access
 * @param enabledModules - Array of enabled module slugs
 * @returns Array of permission strings the user has
 */
export async function getPermissionsForUser(
  tenantId: string,
  isOwner: boolean,
  isAdmin: boolean,
  enabledModules: string[]
): Promise<string[]> {
  // Get all possible permissions
  const allPermissions = getAllPermissions();

  // OWNER and ADMIN have all permissions (filtered by modules)
  if (isOwner || isAdmin) {
    return allPermissions.filter((p) => isModuleEnabledForPermission(p, enabledModules));
  }

  // Get custom permissions for non-admin users
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { tenantId, role: 'MEMBER' },
    select: { permission: true },
  });

  // Filter by enabled modules
  return rolePermissions
    .map((rp) => rp.permission)
    .filter((p) => isModuleEnabledForPermission(p, enabledModules));
}

/**
 * Grant a permission to non-admin users in an organization.
 *
 * @security This modifies access control. Caller must verify authorization
 * (typically OWNER or ADMIN with settings:permissions access).
 *
 * @param tenantId - The organization ID
 * @param permission - The permission to grant
 * @throws {Error} If database operation fails
 */
export async function grantMemberPermission(
  tenantId: string,
  permission: string
): Promise<void> {
  await prisma.rolePermission.upsert({
    where: {
      tenantId_role_permission: { tenantId, role: 'MEMBER', permission },
    },
    create: { tenantId, role: 'MEMBER', permission },
    update: {}, // No-op if already exists
  });
}

/**
 * Revoke a permission from non-admin users in an organization.
 *
 * @security This modifies access control. Caller must verify authorization
 * (typically OWNER or ADMIN with settings:permissions access).
 *
 * @param tenantId - The organization ID
 * @param permission - The permission to revoke
 * @throws {Error} If database operation fails
 */
export async function revokeMemberPermission(
  tenantId: string,
  permission: string
): Promise<void> {
  await prisma.rolePermission.deleteMany({
    where: { tenantId, role: 'MEMBER', permission },
  });
}

/**
 * Set all permissions for non-admin users (replaces existing).
 *
 * @security This is a destructive operation that replaces all existing
 * MEMBER permissions. Caller must verify authorization (typically OWNER
 * or ADMIN with settings:permissions access).
 *
 * @param tenantId - The organization ID
 * @param permissions - Array of permissions to grant
 * @throws {Error} If database transaction fails
 */
export async function setMemberPermissions(
  tenantId: string,
  permissions: string[]
): Promise<void> {
  // Use a transaction to delete old and create new atomically
  await prisma.$transaction(async (tx) => {
    // Delete all existing permissions for MEMBER role
    await tx.rolePermission.deleteMany({
      where: { tenantId, role: 'MEMBER' },
    });

    // Create new permissions
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          tenantId,
          role: 'MEMBER',
          permission,
        })),
        skipDuplicates: true,
      });
    }
  });
}

/**
 * Check if a permission's module is enabled for the organization.
 *
 * Core modules (users, settings, reports, activity, approvals, documents)
 * are always enabled. Feature modules require explicit enablement.
 *
 * @param permission - The permission string to check (e.g., "assets:view")
 * @param enabledModules - Array of enabled module slugs for the organization
 * @returns True if the module for this permission is enabled
 */
function isModuleEnabledForPermission(permission: string, enabledModules: string[]): boolean {
  const permissionPrefix = permission.split(':')[0];

  // Core modules are always enabled (no module restriction)
  if ((CORE_MODULES as readonly string[]).includes(permissionPrefix)) {
    return true;
  }

  // Check if the permission's module is enabled
  for (const [module, prefixes] of Object.entries(MODULE_PERMISSION_MAP)) {
    if (prefixes.includes(permissionPrefix)) {
      return enabledModules.includes(module);
    }
  }

  // Unknown permission prefix - allow by default (fail-open for extensibility)
  return true;
}

/**
 * Get permissions for a specific role (for UI display)
 *
 * Note: In the boolean-based permission system:
 * - OWNER and ADMIN have all permissions (returned as all permissions)
 * - MANAGER and MEMBER permissions are stored in RolePermission table
 *
 * @param tenantId - The organization ID
 * @param role - The role to get permissions for
 * @param enabledModules - Array of enabled module slugs
 * @returns Array of permission strings for the role
 */
export async function getPermissionsForRole(
  tenantId: string,
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER',
  enabledModules: string[]
): Promise<string[]> {
  // Get all possible permissions
  const allPermissions = getAllPermissions();

  // OWNER and ADMIN have all permissions (filtered by modules)
  if (role === 'OWNER' || role === 'ADMIN') {
    return allPermissions.filter((p) => isModuleEnabledForPermission(p, enabledModules));
  }

  // Get custom permissions for MANAGER or MEMBER from database
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { tenantId, role },
    select: { permission: true },
  });

  // Filter by enabled modules
  return rolePermissions
    .map((rp) => rp.permission)
    .filter((p) => isModuleEnabledForPermission(p, enabledModules));
}

/**
 * Check if a permission string is a valid defined permission.
 *
 * @param permission - The permission string to validate
 * @returns True if the permission is defined in PERMISSIONS constant
 */
export function isValidPermission(permission: string): permission is Permission {
  return (getAllPermissions() as string[]).includes(permission);
}
