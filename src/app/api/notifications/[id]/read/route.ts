import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * PATCH /api/notifications/[id]/read
 * Mark a single notification as read
 */
export const PATCH = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const notification = await prisma.notification.findFirst({
      where: { id, tenantId },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.recipientId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to access this notification' },
        { status: 403 }
      );
    }

    // Update the notification
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  },
  { requireAuth: true }
);
