import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { hasPermission, hasPermissions, isValidPermission } from '@/lib/access-control';

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
  async (request: NextRequest, { tenant }: APIContext) => {
    const { searchParams } = new URL(request.url);
    const singlePermission = searchParams.get('permission');
    const multiplePermissions = searchParams.get('permissions');

    if (!singlePermission && !multiplePermissions) {
      return NextResponse.json(
        { error: 'Missing required query parameter: permission or permissions' },
        { status: 400 }
      );
    }

    const orgId = tenant!.tenantId;

    // Get session to access isOwner and isAdmin flags
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const isOwner = session.user.isOwner ?? false;
    const isAdmin = session.user.isAdmin ?? false;

    // Get enabled modules from organization
    const { prisma: rawPrisma } = await import('@/lib/core/prisma');
    const organization = await rawPrisma.organization.findUnique({
      where: { id: orgId },
      select: { enabledModules: true },
    });

    const enabledModules = organization?.enabledModules || [];

    // Single permission check
    if (singlePermission) {
      if (!isValidPermission(singlePermission)) {
        return NextResponse.json({ error: `Invalid permission: ${singlePermission}` }, { status: 400 });
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
        return NextResponse.json(
          { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
          { status: 400 }
        );
      }

      const permissions = await hasPermissions(orgId, isOwner, isAdmin, permissionList, enabledModules);

      return NextResponse.json({ permissions });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  },
  { requireAuth: true }
);
