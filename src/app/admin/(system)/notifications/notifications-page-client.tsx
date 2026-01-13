'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Package,
  AlertTriangle,
  Bell,
  CheckCheck,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { useNotifications } from '@/features/notifications/components';
import { formatDate } from '@/lib/core/datetime';
import { PageHeader, PageHeaderButton, PageContent } from '@/components/ui/page-header';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
  entityType: string | null;
  entityId: string | null;
}

interface NotificationsPageClientProps {
  initialNotifications: Notification[];
  totalCount: number;
  unreadCount: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LEAVE_REQUEST_APPROVED: CheckCircle,
  LEAVE_REQUEST_REJECTED: XCircle,
  ASSET_ASSIGNED: Package,
  ASSET_UNASSIGNED: Package,
  ASSET_REQUEST_APPROVED: CheckCircle,
  ASSET_REQUEST_REJECTED: XCircle,
  PURCHASE_REQUEST_APPROVED: CheckCircle,
  PURCHASE_REQUEST_REJECTED: XCircle,
  DOCUMENT_EXPIRY_WARNING: AlertTriangle,
  GENERAL: Bell,
};

function getIconColor(type: string): string {
  if (type.includes('REJECTED')) return 'text-red-500';
  if (type.includes('APPROVED') || type.includes('ASSIGNED'))
    return 'text-green-500';
  if (type.includes('WARNING')) return 'text-yellow-500';
  if (type.includes('UNASSIGNED')) return 'text-orange-500';
  return 'text-blue-500';
}

function getTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (type.includes('APPROVED') || type.includes('ASSIGNED')) return 'default';
  if (type.includes('REJECTED')) return 'destructive';
  if (type.includes('WARNING')) return 'outline';
  return 'secondary';
}

export function NotificationsPageClient({
  initialNotifications,
  totalCount,
}: NotificationsPageClientProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { refreshCount } = useNotifications();

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch('/api/notifications', { method: 'POST' });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        refreshCount();
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        refreshCount();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="View and manage your notifications"
        actions={
          unreadCount > 0 ? (
            <PageHeaderButton
              onClick={handleMarkAllRead}
              variant="secondary"
            >
              {markingAllRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all as read
            </PageHeaderButton>
          ) : undefined
        }
      />
      <PageContent>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{totalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unread</CardDescription>
              <CardTitle className="text-2xl text-blue-600">
                {unreadCount}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Read</CardDescription>
              <CardTitle className="text-2xl text-gray-500">
                {totalCount - unreadCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>
                  {filteredNotifications.length} notification
                  {filteredNotifications.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as typeof filter)}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {filter === 'unread'
                    ? 'No unread notifications'
                    : filter === 'read'
                      ? 'No read notifications'
                      : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Notification</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notification) => {
                    const Icon = iconMap[notification.type] || Bell;
                    return (
                      <TableRow
                        key={notification.id}
                        className={cn(!notification.isRead && 'bg-blue-50/50')}
                      >
                        <TableCell>
                          <Icon
                            className={cn(
                              'h-5 w-5',
                              getIconColor(notification.type)
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'font-medium',
                                  !notification.isRead && 'text-blue-900'
                                )}
                              >
                                {notification.title}
                              </span>
                              {!notification.isRead && (
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(notification.type)}>
                            {notification.type
                              .replace(/_/g, ' ')
                              .toLowerCase()
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(notification.createdAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {notification.link && (
                              <Link href={notification.link}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    if (!notification.isRead) {
                                      handleMarkRead(notification.id);
                                    }
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleMarkRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
