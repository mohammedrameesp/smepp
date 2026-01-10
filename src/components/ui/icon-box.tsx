/**
 * @file icon-box.tsx
 * @description Colored icon container for cards and list items
 * @module components/ui
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/core/utils';

const colorVariants = {
  blue: 'bg-blue-100 text-blue-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  purple: 'bg-purple-100 text-purple-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-green-100 text-green-600',
  red: 'bg-red-100 text-red-600',
} as const;

const sizeVariants = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const;

const iconSizeVariants = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
} as const;

export interface IconBoxProps {
  icon: LucideIcon;
  color?: keyof typeof colorVariants;
  size?: keyof typeof sizeVariants;
  className?: string;
}

export function IconBox({
  icon: Icon,
  color = 'slate',
  size = 'md',
  className,
}: IconBoxProps) {
  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center flex-shrink-0',
        colorVariants[color],
        sizeVariants[size],
        className
      )}
    >
      <Icon className={iconSizeVariants[size]} />
    </div>
  );
}
