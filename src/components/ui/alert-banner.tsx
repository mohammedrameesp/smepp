/**
 * @file alert-banner.tsx
 * @description Alert banner for warnings, errors, success, and info messages
 * @module components/ui
 */

import * as React from 'react';
import { LucideIcon, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

const variantStyles = {
  warning: {
    container: 'bg-amber-50 border border-amber-200',
    iconBox: 'bg-amber-100',
    icon: 'text-amber-600',
    title: 'text-amber-800',
    description: 'text-amber-700',
  },
  error: {
    container: 'bg-rose-50 border border-rose-200',
    iconBox: 'bg-rose-100',
    icon: 'text-rose-600',
    title: 'text-rose-800',
    description: 'text-rose-700',
  },
  success: {
    container: 'bg-green-50 border border-green-200',
    iconBox: 'bg-green-100',
    icon: 'text-green-600',
    title: 'text-green-800',
    description: 'text-green-700',
  },
  info: {
    container: 'bg-blue-50 border border-blue-200',
    iconBox: 'bg-blue-100',
    icon: 'text-blue-600',
    title: 'text-blue-800',
    description: 'text-blue-700',
  },
} as const;

const defaultIcons: Record<keyof typeof variantStyles, LucideIcon> = {
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
  info: Info,
};

export interface AlertBannerProps {
  variant: keyof typeof variantStyles;
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function AlertBanner({
  variant,
  icon,
  title,
  description,
  action,
  className,
}: AlertBannerProps) {
  const styles = variantStyles[variant];
  const Icon = icon || defaultIcons[variant];

  return (
    <div
      className={cn(
        'rounded-2xl p-4 flex items-start gap-3',
        styles.container,
        className
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          styles.iconBox
        )}
      >
        <Icon className={cn(ICON_SIZES.md, styles.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={cn('font-semibold', styles.title)}>{title}</h3>
        {description && (
          <div className={cn('text-sm mt-1', styles.description)}>
            {description}
          </div>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0">{action}</div>
      )}
    </div>
  );
}

export interface AlertBannerStackProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertBannerStack({ children, className }: AlertBannerStackProps) {
  return (
    <div className={cn('space-y-4 mb-6', className)}>
      {children}
    </div>
  );
}
