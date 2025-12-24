import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';

/**
 * GET /api/notifications/unread-count
 * Returns the count of unread notifications for the current user
 */
export const GET = withErrorHandler(
  async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.notification.count({
      where: {
        recipientId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  },
  { requireAuth: true, requireTenant: false, skipLogging: true } // Skip logging for frequent polling, allow users without org
);
