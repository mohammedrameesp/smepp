import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { hasPermission, hasPermissions, isValidPermission } from '@/lib/access-control';
import { badRequestResponse } from '@/lib/http/errors';

/**
 * GET /api/permissions/check
 *
 * Check if the current user has specific permission(s)
 *
 * Query params:
 * - permission: Single permission to check (e.g., "assets:edit")
 * - permissions: Comma-separated list of permissions (e.g., "assets:edit,assets:delete")
 *
 * Returns:
 * - Single permission: { allowed: boolean }
 * - Multiple permissions: { permissions: { [key]: boolean } }
 */
export const GET = withErrorHandler(
  async (request: NextRequest, { tenant }) => {
    const { searchParams } = new URL(request.url);
    const singlePermission = searchParams.get('permission');
    const multiplePermissions = searchParams.get('permissions');

    if (!singlePermission && !multiplePermissions) {
      return badRequestResponse('Missing required query parameter: permission or permissions');
    }

    const orgId = tenant!.tenantId;
    const isOwner = tenant!.isOwner ?? false;
    const isAdmin = tenant!.isAdmin ?? false;

    // Get enabled modules from organization
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { enabledModules: true },
    });

    const enabledModules = organization?.enabledModules || [];

    // Single permission check
    if (singlePermission) {
      if (!isValidPermission(singlePermission)) {
        return badRequestResponse(`Invalid permission: ${singlePermission}`);
      }

      const allowed = await hasPermission(orgId, isOwner, isAdmin, singlePermission, enabledModules);

      return NextResponse.json({ allowed });
    }

    // Multiple permissions check
    if (multiplePermissions) {
      const permissionList = multiplePermissions.split(',').map((p) => p.trim());

      // Validate all permissions
      const invalidPermissions = permissionList.filter((p) => !isValidPermission(p));
      if (invalidPermissions.length > 0) {
        return badRequestResponse(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }

      const permissions = await hasPermissions(orgId, isOwner, isAdmin, permissionList, enabledModules);

      return NextResponse.json({ permissions });
    }

    return badRequestResponse('Invalid request');
  },
  { requireAuth: true }
);
