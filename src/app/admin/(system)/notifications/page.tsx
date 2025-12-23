import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
