import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { hasPermission, hasPermissions, isValidPermission } from '@/lib/access-control';
import { OrgRole } from '@prisma/client';

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
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const singlePermission = searchParams.get('permission');
    const multiplePermissions = searchParams.get('permissions');

    if (!singlePermission && !multiplePermissions) {
      return NextResponse.json(
        { error: 'Missing required query parameter: permission or permissions' },
        { status: 400 }
      );
    }

    const orgId = session.user.organizationId;
    const orgRole = session.user.orgRole as OrgRole;

    if (!orgId || !orgRole) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Fetch enabled modules
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { enabledModules: true },
    });

    const enabledModules = org?.enabledModules || [];

    // Single permission check
    if (singlePermission) {
      if (!isValidPermission(singlePermission)) {
        return NextResponse.json({ error: `Invalid permission: ${singlePermission}` }, { status: 400 });
      }

      const allowed = await hasPermission(orgId, orgRole, singlePermission, enabledModules);

      return NextResponse.json({ allowed });
    }

    // Multiple permissions check
    if (multiplePermissions) {
      const permissionList = multiplePermissions.split(',').map((p) => p.trim());

      // Validate all permissions
      const invalidPermissions = permissionList.filter((p) => !isValidPermission(p));
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }

      const permissions = await hasPermissions(orgId, orgRole, permissionList, enabledModules);

      return NextResponse.json({ permissions });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('[Permissions Check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
