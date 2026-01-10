/**
 * @file info-field.tsx
 * @description Label + value display for detail pages
 * @module components/ui
 */

import * as React from 'react';
import { cn } from '@/lib/core/utils';

export interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
  size?: 'sm' | 'md';
  mono?: boolean;
  className?: string;
}

export function InfoField({
  label,
  value,
  size = 'md',
  mono = false,
  className,
}: InfoFieldProps) {
  const isEmpty = value === null || value === undefined || value === '';

  return (
    <div className={cn('p-4 bg-slate-50 rounded-xl', className)}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={cn(
          'text-slate-900',
          size === 'sm' ? 'text-sm' : 'font-semibold',
          mono && 'font-mono',
          isEmpty && 'text-slate-400'
        )}
      >
        {isEmpty ? 'Not specified' : value}
      </p>
    </div>
  );
}

export interface InfoFieldGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function InfoFieldGrid({
  children,
  columns = 2,
  className,
}: InfoFieldGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}
