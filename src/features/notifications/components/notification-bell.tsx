/**
 * @file notification-bell.tsx
 * @description Notification bell icon component with unread count badge, triggers notification dropdown
 * @module components/domains/system/notifications
 */
'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ClientOnly } from '@/components/ui/client-only';
import { useNotifications } from './notification-provider';
import { NotificationDropdown } from './notification-dropdown';

// Fallback bell button shown during SSR to prevent layout shift
function NotificationBellFallback() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 text-white hover:bg-white/20"
    >
      <Bell className="h-5 w-5" />
      <span className="sr-only">Notifications</span>
    </Button>
  );
}

export function NotificationBell() {
  const { unreadCount } = useNotifications();

  return (
    <ClientOnly fallback={<NotificationBellFallback />}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-white hover:bg-white/20"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="sr-only">
              {unreadCount > 0
                ? `${unreadCount} unread notifications`
                : 'Notifications'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
          <NotificationDropdown />
        </PopoverContent>
      </Popover>
    </ClientOnly>
  );
}
