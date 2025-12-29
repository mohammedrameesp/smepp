/**
 * Permission Seeding Utilities
 *
 * Functions to seed default permissions for new organizations
 */

import { OrgRole } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { DEFAULT_MANAGER_PERMISSIONS, DEFAULT_MEMBER_PERMISSIONS } from './permissions';

/**
 * Seed default permissions for a new organization
 *
 * @param tenantId - The organization ID
 */
export async function seedDefaultPermissions(tenantId: string): Promise<void> {
  // Create default MANAGER permissions
  const managerPermissions = DEFAULT_MANAGER_PERMISSIONS.map((permission) => ({
    tenantId,
    role: 'MANAGER' as OrgRole,
    permission,
  }));

  // Create default MEMBER permissions
  const memberPermissions = DEFAULT_MEMBER_PERMISSIONS.map((permission) => ({
    tenantId,
    role: 'MEMBER' as OrgRole,
    permission,
  }));

  // Batch insert (skip duplicates in case of re-run)
  await prisma.rolePermission.createMany({
    data: [...managerPermissions, ...memberPermissions],
    skipDuplicates: true,
  });
}

/**
 * Reset permissions to defaults for an organization
 *
 * @param tenantId - The organization ID
 * @param roles - Optional specific roles to reset (defaults to both MANAGER and MEMBER)
 */
export async function resetToDefaultPermissions(
  tenantId: string,
  roles: OrgRole[] = ['MANAGER', 'MEMBER']
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete existing permissions for specified roles
    await tx.rolePermission.deleteMany({
      where: {
        tenantId,
        role: { in: roles },
      },
    });

    // Re-seed defaults
    const permissionsToCreate: { tenantId: string; role: OrgRole; permission: string }[] = [];

    if (roles.includes('MANAGER')) {
      for (const permission of DEFAULT_MANAGER_PERMISSIONS) {
        permissionsToCreate.push({ tenantId, role: 'MANAGER', permission });
      }
    }

    if (roles.includes('MEMBER')) {
      for (const permission of DEFAULT_MEMBER_PERMISSIONS) {
        permissionsToCreate.push({ tenantId, role: 'MEMBER', permission });
      }
    }

    if (permissionsToCreate.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionsToCreate,
        skipDuplicates: true,
      });
    }
  });
}

/**
 * Copy permissions from one organization to another
 * Useful for creating new orgs based on a template
 *
 * @param sourceOrgId - The source organization ID
 * @param targetOrgId - The target organization ID
 */
export async function copyPermissions(sourceOrgId: string, targetOrgId: string): Promise<void> {
  const sourcePermissions = await prisma.rolePermission.findMany({
    where: { tenantId: sourceOrgId },
    select: { role: true, permission: true },
  });

  if (sourcePermissions.length === 0) {
    // Fall back to defaults if source has no permissions
    await seedDefaultPermissions(targetOrgId);
    return;
  }

  await prisma.rolePermission.createMany({
    data: sourcePermissions.map(({ role, permission }) => ({
      tenantId: targetOrgId,
      role,
      permission,
    })),
    skipDuplicates: true,
  });
}
