/**
 * Permission Seeding Utilities
 *
 * Functions to seed default permissions for new organizations.
 * Uses 'MEMBER' role string for non-admin users (owners and admins have all permissions automatically).
 */

import { prisma } from '@/lib/core/prisma';
import { DEFAULT_MEMBER_PERMISSIONS } from './permissions';

/**
 * Seed default permissions for a new organization
 *
 * @param tenantId - The organization ID
 */
export async function seedDefaultPermissions(tenantId: string): Promise<void> {
  // Create default MEMBER permissions (for non-admin users)
  const memberPermissions = DEFAULT_MEMBER_PERMISSIONS.map((permission) => ({
    tenantId,
    role: 'MEMBER',
    permission,
  }));

  // Batch insert (skip duplicates in case of re-run)
  await prisma.rolePermission.createMany({
    data: memberPermissions,
    skipDuplicates: true,
  });
}

/**
 * Reset permissions to defaults for an organization
 *
 * @param tenantId - The organization ID
 */
export async function resetToDefaultPermissions(tenantId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete existing permissions
    await tx.rolePermission.deleteMany({
      where: { tenantId },
    });

    // Re-seed defaults for MEMBER role
    const permissionsToCreate = DEFAULT_MEMBER_PERMISSIONS.map((permission) => ({
      tenantId,
      role: 'MEMBER',
      permission,
    }));

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
