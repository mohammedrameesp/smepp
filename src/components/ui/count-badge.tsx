/**
 * @file count-badge.tsx
 * @description Badge component for displaying notification counts
 * @module components/ui
 */

import * as React from 'react';
import { cn } from '@/lib/core/utils';

export type CountBadgeVariant = 'default' | 'primary' | 'destructive' | 'warning' | 'success' | 'muted';

export interface CountBadgeProps {
  /** The count to display */
  count: number;
  /** Color variant */
  variant?: CountBadgeVariant;
  /** Maximum count to display (shows "99+" if exceeded) */
  max?: number;
  /** Whether to show the badge when count is 0 */
  showZero?: boolean;
  /** Size of the badge */
  size?: 'sm' | 'default' | 'lg';
  /** Additional className */
  className?: string;
}

const variantStyles: Record<CountBadgeVariant, string> = {
  default: 'bg-gray-500 text-white',
  primary: 'bg-primary text-primary-foreground',
  destructive: 'bg-rose-500 text-white',
  warning: 'bg-amber-500 text-white',
  success: 'bg-emerald-500 text-white',
  muted: 'bg-gray-200 text-gray-700',
};

const sizeStyles: Record<'sm' | 'default' | 'lg', string> = {
  sm: 'text-[10px] px-1 py-0.5 min-w-[16px]',
  default: 'text-xs px-1.5 py-0.5 min-w-[20px]',
  lg: 'text-sm px-2 py-0.5 min-w-[24px]',
};

/**
 * Count badge for displaying notification counts.
 * Commonly used for unread messages, pending items, etc.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CountBadge count={5} />
 *
 * // With max limit
 * <CountBadge count={150} max={99} /> // Shows "99+"
 *
 * // Different variants
 * <CountBadge count={3} variant="warning" />
 * <CountBadge count={10} variant="success" />
 *
 * // In a button
 * <Button>
 *   Notifications
 *   <CountBadge count={unreadCount} className="ml-2" />
 * </Button>
 * ```
 */
export function CountBadge({
  count,
  variant = 'destructive',
  max = 99,
  showZero = false,
  size = 'default',
  className,
}: CountBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  const displayValue = count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {displayValue}
    </span>
  );
}

/**
 * Dot indicator (no count, just presence)
 */
export function NotificationDot({
  variant = 'destructive',
  size = 'default',
  className,
  pulse = false,
}: {
  variant?: CountBadgeVariant;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  pulse?: boolean;
}) {
  const dotSizes: Record<'sm' | 'default' | 'lg', string> = {
    sm: 'h-1.5 w-1.5',
    default: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        variantStyles[variant],
        dotSizes[size],
        pulse && 'animate-pulse',
        className
      )}
    />
  );
}

/**
 * Badge with icon and optional count
 */
export function IconCountBadge({
  icon: Icon,
  count,
  variant = 'destructive',
  showZero = false,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  variant?: CountBadgeVariant;
  showZero?: boolean;
  className?: string;
}) {
  const showCount = count > 0 || showZero;

  return (
    <span className={cn('relative inline-flex', className)}>
      <Icon className="h-5 w-5" />
      {showCount && (
        <CountBadge
          count={count}
          variant={variant}
          size="sm"
          className="absolute -top-1 -right-1"
        />
      )}
    </span>
  );
}

/**
 * Inline count badge for text (e.g., "Pending (5)")
 */
export function InlineCount({
  count,
  showZero = false,
  className,
}: {
  count: number;
  showZero?: boolean;
  className?: string;
}) {
  if (count === 0 && !showZero) {
    return null;
  }

  return (
    <span className={cn('text-muted-foreground', className)}>
      ({count})
    </span>
  );
}
