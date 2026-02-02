/**
 * @module api/admin/change-requests
 * @description Admin API for managing employee profile change requests.
 *
 * Employees can submit requests to update their profile information,
 * which admins review and approve or reject through this endpoint.
 *
 * @endpoints
 * - GET /api/admin/change-requests - List all change requests with stats
 *
 * @queryParams
 * - status: Filter by status ('all', 'PENDING', 'APPROVED', 'REJECTED')
 *
 * @security Requires admin authentication and tenant context
 */
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/admin/change-requests - Get all change requests (admin only)
async function getChangeRequestsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';

  const where: Record<string, unknown> = {};
  if (status !== 'all') {
    where.status = status.toUpperCase();
  }

  const requests = await db.profileChangeRequest.findMany({
    where,
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    total: await db.profileChangeRequest.count(),
    pending: await db.profileChangeRequest.count({ where: { status: 'PENDING' } }),
    approved: await db.profileChangeRequest.count({ where: { status: 'APPROVED' } }),
    rejected: await db.profileChangeRequest.count({ where: { status: 'REJECTED' } }),
  };

  return NextResponse.json({ requests, stats });
}

export const GET = withErrorHandler(getChangeRequestsHandler, { requireAuth: true, requireAdmin: true });

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * File: src/app/api/admin/change-requests/route.ts
 * Reviewed: 2026-02-01
 *
 * FUNCTIONALITY: [PASS]
 * - Lists all profile change requests with member details
 * - Supports status filtering (all, PENDING, APPROVED, REJECTED)
 * - Returns aggregate stats (total, pending, approved, rejected counts)
 *
 * SECURITY: [PASS]
 * - Requires admin authentication
 * - Uses tenant-scoped Prisma client (auto-filters by tenantId)
 * - Explicit tenant context validation
 *
 * PERFORMANCE: [ACCEPTABLE]
 * - Multiple count queries could be combined with groupBy
 * - Consider pagination for large organizations
 *
 * ERROR HANDLING: [PASS]
 * - Tenant context validation returns 403
 * - Wrapped with error handler for global error boundary
 *
 * IMPROVEMENTS:
 * - Add pagination support
 * - Combine 4 count queries into single groupBy for efficiency
 * - Consider including resolver info in response
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
