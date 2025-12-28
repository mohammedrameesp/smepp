import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { notificationQuerySchema } from '@/lib/validations/system/notifications';

/**
 * GET /api/notifications
 * List user's notifications with pagination and optional filtering
 */
export const GET = withErrorHandler(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { searchParams } = new URL(request.url);
    const query = notificationQuerySchema.parse({
      isRead: searchParams.get('isRead') || undefined,
      p: searchParams.get('p') || '1',
      ps: searchParams.get('ps') || '20',
    });

    // Include tenantId to ensure user only sees notifications for current org
    const where: { recipientId: string; tenantId: string; isRead?: boolean } = {
      recipientId: session.user.id,
      tenantId,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.p - 1) * query.ps,
        take: query.ps,
      }),
      prisma.notification.count({ where }),
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
  async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const result = await prisma.notification.updateMany({
      where: {
        recipientId: session.user.id,
        tenantId,
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
