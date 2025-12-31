/**
 * @file notification-dropdown.tsx
 * @description Dropdown component displaying list of notifications with mark as read functionality
 * @module components/domains/system/notifications
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { NotificationItem } from './notification-item';
import { useNotifications } from './notification-provider';
import { Loader2, CheckCheck, Bell, RefreshCw } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { refreshCount, refreshTrigger, lastUpdated } = useNotifications();

  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const res = await fetch('/api/notifications?ps=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refresh when trigger changes (from context)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchNotifications(true);
    }
  }, [refreshTrigger, fetchNotifications]);

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

  const hasUnread = notifications.some((n) => !n.isRead);

  const handleRefresh = () => {
    fetchNotifications(true);
  };

  // Format relative time (e.g., "2 min ago")
  const formatRelativeTime = (date: Date | null) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-6 w-6"
            title="Refresh notifications"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(lastUpdated)}
            </span>
          )}
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="text-xs h-7 px-2"
            >
              {markingAllRead ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Mark all read
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="h-80">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
              />
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="p-2 border-t">
        <Link href="/admin/notifications">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            View all notifications
          </Button>
        </Link>
      </div>
    </div>
  );
}
