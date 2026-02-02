/**
 * @file route.ts
 * @description Mark notification as read endpoint
 * @module api/notifications/[id]/read
 *
 * Marks a single notification as read for the current user.
 * Validates that the notification belongs to the requesting user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * PATCH /api/notifications/[id]/read
 *
 * Mark a single notification as read.
 * Verifies the notification belongs to the current user before updating.
 *
 * @param id - Notification ID from URL params
 * @returns Updated notification object
 */
export const PATCH = withErrorHandler(
  async (request: NextRequest, context: APIContext) => {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst - tenantId is auto-filtered by tenant-scoped prisma client
    const notification = await db.notification.findFirst({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.recipientId !== tenant.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to access this notification' },
        { status: 403 }
      );
    }

    // Update the notification
    const updated = await db.notification.update({
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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 *   - Enhanced PATCH handler documentation
 * Issues: None - Proper authorization check (recipientId === userId),
 *   tenant isolation via tenant-scoped prisma client,
 *   proper 404 and 403 error handling
 */
