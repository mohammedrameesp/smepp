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
