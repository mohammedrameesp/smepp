/**
 * @file trend-indicator.tsx
 * @description Trend indicator components for displaying value changes and comparisons
 * @module components/ui
 */

import * as React from 'react';
import { cn } from '@/lib/core/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  value: number;
  previousValue: number;
  format?: 'number' | 'percent';
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function TrendIndicator({
  value,
  previousValue,
  format = 'number',
  showIcon = true,
  className,
  size = 'sm',
}: TrendIndicatorProps) {
  const change = value - previousValue;
  const percentChange = previousValue > 0
    ? ((change / previousValue) * 100).toFixed(1)
    : change > 0 ? '+100' : '0';

  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  const displayValue = format === 'percent'
    ? `${isPositive ? '+' : ''}${percentChange}%`
    : `${isPositive ? '+' : ''}${change}`;

  const sizeClasses = size === 'sm'
    ? 'text-xs gap-0.5 [&_svg]:h-3 [&_svg]:w-3'
    : 'text-sm gap-1 [&_svg]:h-4 [&_svg]:w-4';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
        sizeClasses,
        isPositive && 'text-emerald-600',
        isNegative && 'text-red-600',
        isNeutral && 'text-slate-500',
        className
      )}
      aria-label={`${isPositive ? 'Increased' : isNegative ? 'Decreased' : 'No change'} by ${Math.abs(change)}`}
    >
      {showIcon && <Icon aria-hidden="true" />}
      <span>{displayValue}</span>
    </span>
  );
}

// Compact version for stat cards - shows trend with label
export function StatTrend({
  current,
  previous,
  label = 'vs last month',
}: {
  current: number;
  previous: number;
  label?: string;
}) {
  if (previous === 0 && current === 0) return null;

  const change = current - previous;
  const percentChange = previous > 0
    ? Math.round((change / previous) * 100)
    : current > 0 ? 100 : 0;

  const isPositive = change > 0;
  const isNegative = change < 0;

  if (change === 0) return null;

  return (
    <div className="flex items-center gap-1 mt-1">
      <span
        className={cn(
          'inline-flex items-center text-xs font-medium gap-0.5',
          isPositive && 'text-emerald-600',
          isNegative && 'text-red-600'
        )}
      >
        {isPositive ? (
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <TrendingDown className="h-3 w-3" aria-hidden="true" />
        )}
        <span>{isPositive ? '+' : ''}{percentChange}%</span>
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
