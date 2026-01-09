import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import {
  getPermissionsForRole,
  setRolePermissions,
  PERMISSION_GROUPS,
  getAllPermissions,
  isValidPermission,
  resetToDefaultPermissions,
} from '@/lib/access-control';
import { OrgRole } from '@prisma/client';
import { z } from 'zod';

/**
 * GET /api/admin/permissions
 *
 * Get current permission configuration for the organization
 * Returns permissions for MANAGER and MEMBER roles
 */
export const GET = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Organization is a non-tenant model, use raw prisma
    const org = await prisma.organization.findUnique({
      where: { id: tenant.tenantId },
      select: { enabledModules: true },
    });

    const enabledModules = org?.enabledModules || [];

    // Get permissions for each role
    const [managerPermissions, memberPermissions] = await Promise.all([
      getPermissionsForRole(tenant.tenantId, 'MANAGER', enabledModules),
      getPermissionsForRole(tenant.tenantId, 'MEMBER', enabledModules),
    ]);

    return NextResponse.json({
      roles: {
        MANAGER: managerPermissions,
        MEMBER: memberPermissions,
      },
      permissionGroups: PERMISSION_GROUPS,
      allPermissions: getAllPermissions(),
      enabledModules,
    });
  },
  { requireAuth: true, requireOrgRole: ['OWNER', 'ADMIN'] }
);

const updatePermissionsSchema = z.object({
  role: z.enum(['MANAGER', 'MEMBER']),
  permissions: z.array(z.string()),
});

/**
 * PUT /api/admin/permissions
 *
 * Update permissions for a specific role
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updatePermissionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { role, permissions } = parsed.data;

    // Validate all permissions are valid
    const invalidPermissions = permissions.filter((p) => !isValidPermission(p));
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Set permissions for the role
    await setRolePermissions(tenant.tenantId, role as OrgRole, permissions);

    return NextResponse.json({
      success: true,
      role,
      permissions,
    });
  },
  { requireAuth: true, requireOrgRole: ['OWNER', 'ADMIN'] }
);

const resetPermissionsSchema = z.object({
  roles: z.array(z.enum(['MANAGER', 'MEMBER'])).optional(),
});

/**
 * POST /api/admin/permissions/reset
 *
 * Reset permissions to defaults
 */
export const POST = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = resetPermissionsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { roles } = parsed.data;
    const rolesToReset: OrgRole[] = roles || ['MANAGER', 'MEMBER'];

    await resetToDefaultPermissions(tenant.tenantId, rolesToReset);

    return NextResponse.json({
      success: true,
      message: `Permissions reset to defaults for: ${rolesToReset.join(', ')}`,
    });
  },
  { requireAuth: true, requireOrgRole: ['OWNER', 'ADMIN'] }
);
