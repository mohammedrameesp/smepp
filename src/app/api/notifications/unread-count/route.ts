import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the current user
 */
export const GET = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    // If no tenant context (e.g., super admin), return 0
    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ count: 0 });
    }

    const db = tenantPrisma as TenantPrismaClient;

    const count = await db.notification.count({
      where: {
        recipientId: tenant.userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  },
  { requireAuth: true, requireTenant: false, skipLogging: true }
);
