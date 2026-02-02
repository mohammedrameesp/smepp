/**
 * @module api/permissions/check
 * @description Permission verification endpoint for client-side authorization checks.
 *
 * Checks if the authenticated user has specific permission(s) within their organization.
 * Supports both single permission and bulk permission checks for efficient UI rendering.
 * Considers owner/admin status and enabled modules when evaluating permissions.
 *
 * @authentication Required - Uses withErrorHandler with requireAuth
 * @authorization Any authenticated organization member
 *
 * @example
 * GET /api/permissions/check?permission=assets:edit
 * Response: { "allowed": true }
 *
 * GET /api/permissions/check?permissions=assets:edit,assets:delete,employees:view
 * Response: { "permissions": { "assets:edit": true, "assets:delete": false, "employees:view": true } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { hasPermission, hasPermissions, isValidPermission } from '@/lib/access-control';
import { badRequestResponse } from '@/lib/http/errors';
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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STRENGTHS:
 * - Uses withErrorHandler pattern for consistent auth handling
 * - Supports both single and bulk permission checks (efficient for UI)
 * - Validates permission strings before processing
 * - Considers enabled modules when evaluating permissions
 * - Clear API documentation in JSDoc
 *
 * CONCERNS:
 * - Fetches organization on every request (could be cached in session)
 * - No rate limiting (could be used for permission enumeration)
 * - tenant! non-null assertion assumes requireAuth guarantees tenant
 * - enabledModules defaults to empty array (may cause incorrect denials)
 *
 * RECOMMENDATIONS:
 * - Cache enabled modules in session to reduce DB queries
 * - Add rate limiting for this endpoint
 * - Handle null tenant explicitly with proper error
 * - Consider caching permission results for short duration
 * - Add request logging for security auditing
 *
 * SECURITY NOTES:
 * - Authentication required via withErrorHandler
 * - Permission validation prevents injection attacks
 * - Only returns boolean results (no information leakage)
 */
