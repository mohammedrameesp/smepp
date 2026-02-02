/**
 * @file route.ts
 * @description Unread notification count endpoint
 * @module api/notifications/unread-count
 *
 * Lightweight endpoint for fetching the count of unread notifications.
 * Used by the notification bell icon in the header.
 * Skips logging to reduce noise from frequent polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the current user.
 * Returns 0 if no tenant context (e.g., super admin).
 *
 * @returns {number} count - Number of unread notifications
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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 *   - Added return type documentation
 *   - Documented skipLogging rationale
 * Issues: None - Properly handles missing tenant context,
 *   uses recipientId for user-scoped filtering
 */
