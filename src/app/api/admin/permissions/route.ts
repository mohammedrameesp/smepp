import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import {
  getPermissionsForUser,
  setMemberPermissions,
  PERMISSION_GROUPS,
  getAllPermissions,
  isValidPermission,
  resetToDefaultPermissions,
} from '@/lib/access-control';
import { z } from 'zod';

/**
 * GET /api/admin/permissions
 *
 * Get current permission configuration for the organization
 * Returns permissions for non-admin members
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

    // Get permissions for non-admin members (isOwner=false, isAdmin=false)
    const memberPermissions = await getPermissionsForUser(tenant.tenantId, false, false, enabledModules);

    return NextResponse.json({
      roles: {
        MEMBER: memberPermissions,
      },
      permissionGroups: PERMISSION_GROUPS,
      allPermissions: getAllPermissions(),
      enabledModules,
    });
  },
  { requireAdmin: true }
);

const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

/**
 * PUT /api/admin/permissions
 *
 * Update permissions for non-admin members
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

    const { permissions } = parsed.data;

    // Validate all permissions are valid
    const invalidPermissions = permissions.filter((p) => !isValidPermission(p));
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Set permissions for non-admin members
    await setMemberPermissions(tenant.tenantId, permissions);

    return NextResponse.json({
      success: true,
      permissions,
    });
  },
  { requireAdmin: true }
);

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

    await resetToDefaultPermissions(tenant.tenantId);

    return NextResponse.json({
      success: true,
      message: 'Permissions reset to defaults',
    });
  },
  { requireAdmin: true }
);
