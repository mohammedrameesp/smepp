/**
 * @module app/admin/(system)/notifications/page
 * @description Server component page for viewing user notifications.
 * Fetches notifications for the current user and renders the client component
 * for interactive filtering and management.
 *
 * @dependencies
 * - prisma: Database queries for notifications
 * - NotificationsPageClient: Client component for interactivity
 *
 * @routes
 * - GET /admin/notifications - Displays user notifications
 *
 * @access Requires authenticated session with valid user ID
 *
 * @data-fetching
 * - Fetches up to 100 most recent notifications
 * - Calculates total and unread counts in parallel
 * - Orders by createdAt descending
 *
 * @note Notifications are user-scoped, not tenant-scoped
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { redirect } from 'next/navigation';
import { NotificationsPageClient } from './notifications-page-client';

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch all notifications for the current user
  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: session.user.id,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Count stats
  const [totalCount, unreadCount] = await Promise.all([
    prisma.notification.count({
      where: { recipientId: session.user.id },
    }),
    prisma.notification.count({
      where: { recipientId: session.user.id, isRead: false },
    }),
  ]);

  return (
    <NotificationsPageClient
      initialNotifications={notifications}
      totalCount={totalCount}
      unreadCount={unreadCount}
    />
  );
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Date: 2026-02-01
 * Reviewer: Claude (AI Code Review)
 *
 * Overall Assessment: PASS
 * Clean server component with proper data fetching.
 *
 * Strengths:
 * 1. Proper auth check with redirect for unauthenticated users
 * 2. Efficient parallel data fetching with Promise.all
 * 3. Reasonable limit (100) to prevent memory issues
 * 4. Clear separation of server/client responsibilities
 * 5. Proper date ordering (most recent first)
 *
 * Potential Improvements:
 * 1. Consider cursor-based pagination for better UX with many notifications
 * 2. Could add tenant context validation (currently user-scoped only)
 * 3. Consider adding metadata export for page title
 * 4. Hard-coded limit of 100 - could be configurable
 *
 * Security: Good - proper session validation
 * Performance: Good - parallel queries, limited results
 * Maintainability: Excellent - simple, focused component
 *
 * Note: Notifications are intentionally user-scoped (not tenant-scoped)
 * which is correct for cross-org user support.
 */
