/**
 * @file seed-permissions.ts
 * @module access-control
 * @description Permission Seeding Utilities for new organizations.
 *
 * Functions to seed default permissions when creating new organizations.
 * Uses 'MEMBER' role for non-admin users - owners and admins have all
 * permissions automatically via boolean flags.
 *
 * @security These functions modify access control data. They should only
 * be called during organization creation or by authorized admins.
 */

import { prisma } from '@/lib/core/prisma';
import { DEFAULT_MEMBER_PERMISSIONS } from './permissions';

/**
 * Seed default permissions for a new organization.
 *
 * Creates the default MEMBER role permissions. This should be called
 * when a new organization is created.
 *
 * @security Only call during organization creation workflow.
 *
 * @param tenantId - The organization ID
 * @throws {Error} If database operation fails
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
 * Reset permissions to defaults for an organization.
 *
 * @security This is a destructive operation that removes all custom
 * permissions. Caller must verify authorization (typically OWNER or
 * ADMIN with settings:permissions access).
 *
 * @param tenantId - The organization ID
 * @throws {Error} If database transaction fails
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
