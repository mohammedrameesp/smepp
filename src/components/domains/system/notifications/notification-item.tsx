/**
 * @file notification-item.tsx
 * @description Individual notification item component with icon mapping and read status indication
 * @module components/domains/system/notifications
 */
'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Package,
  FileText,
  AlertTriangle,
  Bell,
  ClipboardCheck,
  UserCheck,
} from 'lucide-react';

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: string;
  };
  onMarkRead: (id: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LEAVE_REQUEST_SUBMITTED: FileText,
  LEAVE_REQUEST_APPROVED: CheckCircle,
  LEAVE_REQUEST_REJECTED: XCircle,
  LEAVE_REQUEST_CANCELLED: XCircle,
  ASSET_ASSIGNED: Package,
  ASSET_UNASSIGNED: Package,
  ASSET_REQUEST_SUBMITTED: Package,
  ASSET_REQUEST_APPROVED: CheckCircle,
  ASSET_REQUEST_REJECTED: XCircle,
  ASSET_RETURN_SUBMITTED: Package,
  ASSET_ASSIGNMENT_PENDING: Package,
  ASSET_ASSIGNMENT_ACCEPTED: CheckCircle,
  ASSET_ASSIGNMENT_DECLINED: XCircle,
  PURCHASE_REQUEST_SUBMITTED: FileText,
  PURCHASE_REQUEST_APPROVED: CheckCircle,
  PURCHASE_REQUEST_REJECTED: XCircle,
  DOCUMENT_EXPIRY_WARNING: AlertTriangle,
  // Multi-level approval notifications
  APPROVAL_PENDING: ClipboardCheck,
  APPROVAL_STEP_COMPLETED: UserCheck,
  APPROVAL_FINAL_APPROVED: CheckCircle,
  APPROVAL_REJECTED: XCircle,
  GENERAL: Bell,
};

function getIconColor(type: string): string {
  if (type.includes('REJECTED') || type.includes('DECLINED') || type.includes('CANCELLED')) return 'text-red-500';
  if (type.includes('APPROVED') || type.includes('ACCEPTED')) return 'text-green-500';
  if (type.includes('ASSIGNED') && !type.includes('UNASSIGNED')) return 'text-green-500';
  if (type.includes('WARNING')) return 'text-yellow-500';
  if (type.includes('UNASSIGNED')) return 'text-orange-500';
  if (type.includes('SUBMITTED') || type.includes('PENDING')) return 'text-blue-500';
  return 'text-blue-500';
}

export function NotificationItem({
  notification,
  onMarkRead,
}: NotificationItemProps) {
  const Icon = iconMap[notification.type] || Bell;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
  });

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
  };

  const content = (
    <div
      className={cn(
        'flex gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors',
        !notification.isRead && 'bg-blue-50'
      )}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn('h-5 w-5', getIconColor(notification.type))} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!notification.isRead && (
        <div className="flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
        </div>
      )}
    </div>
  );

  if (notification.link) {
    return (
      <Link href={notification.link} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return content;
}
