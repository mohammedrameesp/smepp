/**
 * @file info-display.tsx
 * @description Entity details display box for dialogs and cards
 * @module components/ui
 */

import * as React from 'react';
import { cn } from '@/lib/core/utils';

export interface InfoItem {
  label: string;
  value?: React.ReactNode;
  hidden?: boolean;
  mono?: boolean;
}

export interface InfoDisplayProps {
  title?: string;
  items: InfoItem[];
  className?: string;
  columns?: 1 | 2;
}

/**
 * Gray background info box showing entity details.
 * Common pattern in dialogs showing asset/entity information.
 *
 * @example
 * ```tsx
 * <InfoDisplay
 *   title="Asset Details"
 *   items={[
 *     { label: 'Model', value: asset.model },
 *     { label: 'Brand', value: asset.brand },
 *     { label: 'Asset Tag', value: asset.assetTag, mono: true },
 *   ]}
 * />
 * ```
 */
export function InfoDisplay({
  title,
  items,
  className,
  columns = 1,
}: InfoDisplayProps) {
  const visibleItems = items.filter(
    (item) => !item.hidden && item.value !== undefined && item.value !== null && item.value !== ''
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn('bg-gray-50 p-4 rounded-lg', className)}>
      {title && (
        <h4 className="font-medium text-sm text-gray-700 mb-2">{title}</h4>
      )}
      <div
        className={cn(
          'space-y-1 text-sm',
          columns === 2 && 'grid grid-cols-2 gap-x-4 gap-y-1 space-y-0'
        )}
      >
        {visibleItems.map((item, idx) => (
          <p key={idx}>
            <span className="text-gray-500">{item.label}:</span>{' '}
            <span className={cn(item.mono && 'font-mono')}>{item.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact version for smaller spaces
 */
export function InfoDisplayCompact({
  items,
  className,
}: {
  items: InfoItem[];
  className?: string;
}) {
  const visibleItems = items.filter(
    (item) => !item.hidden && item.value !== undefined && item.value !== null && item.value !== ''
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className={cn('text-sm text-gray-600', className)}>
      {visibleItems.map((item, idx) => (
        <span key={idx}>
          {idx > 0 && ' · '}
          {item.value}
        </span>
      ))}
    </div>
  );
}

/**
 * Horizontal key-value list
 */
export function InfoList({
  items,
  className,
}: {
  items: InfoItem[];
  className?: string;
}) {
  const visibleItems = items.filter(
    (item) => !item.hidden && item.value !== undefined && item.value !== null && item.value !== ''
  );

  return (
    <dl className={cn('space-y-2', className)}>
      {visibleItems.map((item, idx) => (
        <div key={idx} className="flex justify-between">
          <dt className="text-sm text-gray-500">{item.label}</dt>
          <dd className={cn('text-sm font-medium', item.mono && 'font-mono')}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
