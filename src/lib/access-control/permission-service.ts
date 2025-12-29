/**
 * Permission Check Service
 *
 * Provides functions to check if a user has specific permissions
 * based on their organization role and the organization's custom permission settings.
 */

import { OrgRole } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { MODULE_PERMISSION_MAP, getAllPermissions } from './permissions';

/**
 * Check if a user has a specific permission
 *
 * @param tenantId - The organization ID
 * @param orgRole - The user's organization role (OWNER, ADMIN, MANAGER, MEMBER)
 * @param permission - The permission to check (e.g., "assets:view")
 * @param enabledModules - Array of enabled module slugs for the organization
 * @returns true if the user has the permission
 */
export async function hasPermission(
  tenantId: string,
  orgRole: OrgRole,
  permission: string,
  enabledModules: string[]
): Promise<boolean> {
  // OWNER and ADMIN have all permissions
  if (orgRole === 'OWNER' || orgRole === 'ADMIN') {
    // Still check if the module is enabled
    return isModuleEnabledForPermission(permission, enabledModules);
  }

  // Check if the module for this permission is enabled
  if (!isModuleEnabledForPermission(permission, enabledModules)) {
    return false;
  }

  // Check custom permission for MANAGER/MEMBER from database
  const rolePermission = await prisma.rolePermission.findUnique({
    where: {
      tenantId_role_permission: { tenantId, role: orgRole, permission },
    },
  });

  return !!rolePermission;
}

/**
 * Check multiple permissions at once (more efficient than individual checks)
 *
 * @param tenantId - The organization ID
 * @param orgRole - The user's organization role
 * @param permissions - Array of permissions to check
 * @param enabledModules - Array of enabled module slugs
 * @returns Object mapping each permission to boolean
 */
export async function hasPermissions(
  tenantId: string,
  orgRole: OrgRole,
  permissions: string[],
  enabledModules: string[]
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};

  // OWNER and ADMIN have all permissions (just check modules)
  if (orgRole === 'OWNER' || orgRole === 'ADMIN') {
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

  // Batch query for MANAGER/MEMBER permissions
  if (moduleFilteredPermissions.length > 0) {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        tenantId,
        role: orgRole,
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
 * Get all permissions for a role in an organization
 *
 * @param tenantId - The organization ID
 * @param orgRole - The user's organization role
 * @param enabledModules - Array of enabled module slugs
 * @returns Array of permission strings the role has
 */
export async function getPermissionsForRole(
  tenantId: string,
  orgRole: OrgRole,
  enabledModules: string[]
): Promise<string[]> {
  // Get all possible permissions
  const allPermissions = getAllPermissions();

  // OWNER and ADMIN have all permissions (filtered by modules)
  if (orgRole === 'OWNER' || orgRole === 'ADMIN') {
    return allPermissions.filter((p) => isModuleEnabledForPermission(p, enabledModules));
  }

  // Get custom permissions for MANAGER/MEMBER
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { tenantId, role: orgRole },
    select: { permission: true },
  });

  // Filter by enabled modules
  return rolePermissions
    .map((rp) => rp.permission)
    .filter((p) => isModuleEnabledForPermission(p, enabledModules));
}

/**
 * Grant a permission to a role
 *
 * @param tenantId - The organization ID
 * @param role - The role to grant permission to (MANAGER or MEMBER)
 * @param permission - The permission to grant
 */
export async function grantPermission(
  tenantId: string,
  role: OrgRole,
  permission: string
): Promise<void> {
  // Don't store permissions for OWNER/ADMIN (they have all by default)
  if (role === 'OWNER' || role === 'ADMIN') {
    return;
  }

  await prisma.rolePermission.upsert({
    where: {
      tenantId_role_permission: { tenantId, role, permission },
    },
    create: { tenantId, role, permission },
    update: {}, // No-op if already exists
  });
}

/**
 * Revoke a permission from a role
 *
 * @param tenantId - The organization ID
 * @param role - The role to revoke permission from
 * @param permission - The permission to revoke
 */
export async function revokePermission(
  tenantId: string,
  role: OrgRole,
  permission: string
): Promise<void> {
  await prisma.rolePermission.deleteMany({
    where: { tenantId, role, permission },
  });
}

/**
 * Set all permissions for a role (replaces existing)
 *
 * @param tenantId - The organization ID
 * @param role - The role to set permissions for
 * @param permissions - Array of permissions to grant
 */
export async function setRolePermissions(
  tenantId: string,
  role: OrgRole,
  permissions: string[]
): Promise<void> {
  // Don't store permissions for OWNER/ADMIN
  if (role === 'OWNER' || role === 'ADMIN') {
    return;
  }

  // Use a transaction to delete old and create new
  await prisma.$transaction(async (tx) => {
    // Delete all existing permissions for this role
    await tx.rolePermission.deleteMany({
      where: { tenantId, role },
    });

    // Create new permissions
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({
          tenantId,
          role,
          permission,
        })),
        skipDuplicates: true,
      });
    }
  });
}

/**
 * Check if a permission's module is enabled
 */
function isModuleEnabledForPermission(permission: string, enabledModules: string[]): boolean {
  const permissionPrefix = permission.split(':')[0];

  // Core modules are always enabled (no module restriction)
  const coreModules = ['users', 'settings', 'reports', 'activity', 'approvals', 'documents'];
  if (coreModules.includes(permissionPrefix)) {
    return true;
  }

  // Check if the permission's module is enabled
  for (const [module, prefixes] of Object.entries(MODULE_PERMISSION_MAP)) {
    if (prefixes.includes(permissionPrefix)) {
      return enabledModules.includes(module);
    }
  }

  // Unknown permission prefix - allow by default
  return true;
}

/**
 * Check if a permission is valid
 */
export function isValidPermission(permission: string): boolean {
  return getAllPermissions().includes(permission);
}
