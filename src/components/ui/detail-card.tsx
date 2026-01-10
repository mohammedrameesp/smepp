/**
 * @file detail-card.tsx
 * @description Card container for detail page sections with icon header
 * @module components/ui
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { IconBox, IconBoxProps } from './icon-box';

export interface DetailCardProps {
  icon: LucideIcon;
  iconColor?: IconBoxProps['color'];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function DetailCard({
  icon,
  iconColor = 'slate',
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
  noPadding = false,
}: DetailCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 overflow-hidden',
        className
      )}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <IconBox icon={icon} color={iconColor} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0">{actions}</div>
        )}
      </div>
      <div className={cn(!noPadding && 'p-5', contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export interface DetailCardHeaderProps {
  icon: LucideIcon;
  iconColor?: IconBoxProps['color'];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DetailCardHeader({
  icon,
  iconColor = 'slate',
  title,
  subtitle,
  actions,
}: DetailCardHeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
      <IconBox icon={icon} color={iconColor} />
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">{actions}</div>
      )}
    </div>
  );
}
