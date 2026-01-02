import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the current user
 */
export const GET = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant } = context;

    // If no tenant context (e.g., super admin), return 0
    if (!tenant?.tenantId || !tenant?.userId) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.notification.count({
      where: {
        tenantId: tenant.tenantId,
        recipientId: tenant.userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  },
  { requireAuth: true, requireTenant: false, skipLogging: true }
);
