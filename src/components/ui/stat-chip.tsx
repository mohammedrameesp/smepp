/**
 * @file stat-chip.tsx
 * @description Stat chip components for displaying metrics in page headers
 * @module components/ui
 */

import Link from 'next/link';
import { cn } from '@/lib/core/utils';

/**
 * Available color variants for stat chips.
 * Maps to Tailwind color classes with transparency.
 */
export type StatChipColor =
  | 'blue'
  | 'emerald'
  | 'green'
  | 'purple'
  | 'amber'
  | 'rose'
  | 'slate'
  | 'red'
  | 'orange'
  | 'cyan'
  | 'indigo';

/**
 * Configuration for a stat chip.
 */
export interface StatConfig {
  /** The numeric or string value to display */
  value: number | string;
  /** Label text following the value */
  label: string;
  /** Color theme for the chip */
  color: StatChipColor;
  /** Optional icon component to display before the value */
  icon?: React.ReactNode;
  /** Optional href to make the chip a link */
  href?: string;
  /** Whether to hide the chip when value is 0 or falsy (default: false) */
  hideWhenZero?: boolean;
}

const colorClasses: Record<StatChipColor, { bg: string; text: string; hover?: string }> = {
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    hover: 'hover:bg-blue-500/30',
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    hover: 'hover:bg-emerald-500/30',
  },
  green: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    hover: 'hover:bg-emerald-500/30',
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    hover: 'hover:bg-purple-500/30',
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    hover: 'hover:bg-amber-500/30',
  },
  rose: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    hover: 'hover:bg-rose-500/30',
  },
  slate: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    hover: 'hover:bg-slate-500/30',
  },
  red: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    hover: 'hover:bg-red-500/30',
  },
  orange: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-400',
    hover: 'hover:bg-orange-500/30',
  },
  cyan: {
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    hover: 'hover:bg-cyan-500/30',
  },
  indigo: {
    bg: 'bg-indigo-500/20',
    text: 'text-indigo-400',
    hover: 'hover:bg-indigo-500/30',
  },
};

export interface StatChipProps extends StatConfig {
  /** Additional className for the chip */
  className?: string;
}

/**
 * Individual stat chip component.
 * Displays a value and label with optional icon in a colored pill.
 * Can optionally be a link.
 *
 * @example
 * // Simple stat chip
 * <StatChip value={42} label="total assets" color="blue" />
 *
 * @example
 * // Stat chip with icon and link
 * <StatChip
 *   value={5}
 *   label="pending requests"
 *   color="amber"
 *   icon={<AlertCircle className="h-3.5 w-3.5" />}
 *   href="/admin/requests"
 * />
 */
export function StatChip({
  value,
  label,
  color,
  icon,
  href,
  hideWhenZero,
  className,
}: StatChipProps) {
  // Hide if value is 0/falsy and hideWhenZero is true
  if (hideWhenZero && !value) {
    return null;
  }

  const colors = colorClasses[color];
  const formattedValue = typeof value === 'number' ? value.toLocaleString() : value;

  const content = (
    <>
      {icon && <span className={colors.text}>{icon}</span>}
      <span className={cn(colors.text, 'text-sm font-medium')}>
        {formattedValue} {label}
      </span>
    </>
  );

  const baseClasses = cn(
    'flex items-center gap-2 px-3 py-1.5 rounded-lg',
    colors.bg,
    href && cn(colors.hover, 'transition-colors'),
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}

export interface StatChipGroupProps {
  /** Stat chip elements or StatConfig array */
  children?: React.ReactNode;
  /** Additional className for the group wrapper */
  className?: string;
}

/**
 * Container for grouping stat chips.
 * Provides consistent spacing and wrapping behavior.
 *
 * @example
 * <StatChipGroup>
 *   <StatChip value={42} label="total" color="blue" />
 *   <StatChip value={35} label="active" color="emerald" />
 * </StatChipGroup>
 */
export function StatChipGroup({ children, className }: StatChipGroupProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4 mt-4', className)}>
      {children}
    </div>
  );
}
