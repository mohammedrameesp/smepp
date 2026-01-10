/**
 * @file timeline.tsx
 * @description Timeline component for history/activity displays
 * @module components/ui
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { IconBox, IconBoxProps } from './icon-box';

export interface TimelineItemProps {
  icon?: LucideIcon;
  iconColor?: IconBoxProps['color'];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  timestamp?: React.ReactNode;
  children?: React.ReactNode;
  isLast?: boolean;
}

export function TimelineItem({
  icon,
  iconColor = 'slate',
  title,
  subtitle,
  timestamp,
  children,
  isLast = false,
}: TimelineItemProps) {
  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-slate-200" />
      )}

      {/* Icon */}
      <div className="relative z-10 flex-shrink-0">
        {icon ? (
          <IconBox icon={icon} color={iconColor} size="md" />
        ) : (
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <div className="w-2 h-2 bg-slate-400 rounded-full" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{title}</div>
            {subtitle && (
              <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>
            )}
          </div>
          {timestamp && (
            <div className="text-xs text-slate-400 flex-shrink-0">{timestamp}</div>
          )}
        </div>
        {children && (
          <div className="mt-2">{children}</div>
        )}
      </div>
    </div>
  );
}

export interface TimelineProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isLast: boolean) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function Timeline<T>({
  items,
  renderItem,
  emptyMessage = 'No items to display',
  className,
}: TimelineProps<T>) {
  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-slate-500', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {renderItem(item, index, index === items.length - 1)}
        </React.Fragment>
      ))}
    </div>
  );
}

export interface SimpleTimelineItem {
  id: string;
  icon?: LucideIcon;
  iconColor?: IconBoxProps['color'];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  timestamp?: React.ReactNode;
  content?: React.ReactNode;
}

export interface SimpleTimelineProps {
  items: SimpleTimelineItem[];
  emptyMessage?: string;
  className?: string;
}

export function SimpleTimeline({
  items,
  emptyMessage = 'No items to display',
  className,
}: SimpleTimelineProps) {
  return (
    <Timeline
      items={items}
      emptyMessage={emptyMessage}
      className={className}
      renderItem={(item, _index, isLast) => (
        <TimelineItem
          key={item.id}
          icon={item.icon}
          iconColor={item.iconColor}
          title={item.title}
          subtitle={item.subtitle}
          timestamp={item.timestamp}
          isLast={isLast}
        >
          {item.content}
        </TimelineItem>
      )}
    />
  );
}
