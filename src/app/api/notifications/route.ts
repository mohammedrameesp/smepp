import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { notificationQuerySchema } from '@/features/notifications/validations/notifications';

/**
 * GET /api/notifications
 * List user's notifications with pagination and optional filtering
 */
export const GET = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const { searchParams } = new URL(request.url);
    const query = notificationQuerySchema.parse({
      isRead: searchParams.get('isRead') || undefined,
      p: searchParams.get('p') || '1',
      ps: searchParams.get('ps') || '20',
    });

    // Include recipientId to ensure user only sees their own notifications
    // tenantId is auto-filtered by the tenant-scoped prisma client
    const where: { recipientId: string; isRead?: boolean } = {
      recipientId: tenant.userId,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.p - 1) * query.ps,
        take: query.ps,
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page: query.p,
        pageSize: query.ps,
        total,
        totalPages: Math.ceil(total / query.ps),
        hasMore: query.p * query.ps < total,
      },
    });
  },
  { requireAuth: true }
);

/**
 * POST /api/notifications
 * Mark all notifications as read for the current user
 */
export const POST = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;

    const result = await db.notification.updateMany({
      where: {
        recipientId: tenant.userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedCount: result.count,
    });
  },
  { requireAuth: true }
);
