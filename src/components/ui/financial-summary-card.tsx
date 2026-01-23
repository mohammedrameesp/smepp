/**
 * @file financial-summary-card.tsx
 * @description Financial summary card component for displaying monetary metrics
 *              with optional trend indicators and comparison periods
 * @module components/ui
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  Receipt,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { formatCurrency } from '@/lib/core/currency';

// Icon map for financial icons
const iconMap: Record<string, LucideIcon> = {
  'dollar-sign': DollarSign,
  wallet: Wallet,
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  receipt: Receipt,
};

export type FinancialCardIcon = keyof typeof iconMap;

export type FinancialCardVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const variantStyles: Record<FinancialCardVariant, { icon: string; trend: { up: string; down: string } }> = {
  default: {
    icon: 'bg-slate-100 text-slate-600',
    trend: { up: 'text-emerald-600', down: 'text-rose-600' },
  },
  success: {
    icon: 'bg-emerald-100 text-emerald-600',
    trend: { up: 'text-emerald-600', down: 'text-rose-600' },
  },
  warning: {
    icon: 'bg-amber-100 text-amber-600',
    trend: { up: 'text-emerald-600', down: 'text-rose-600' },
  },
  danger: {
    icon: 'bg-rose-100 text-rose-600',
    trend: { up: 'text-rose-600', down: 'text-emerald-600' }, // Inverted for costs
  },
  info: {
    icon: 'bg-blue-100 text-blue-600',
    trend: { up: 'text-emerald-600', down: 'text-rose-600' },
  },
};

export interface TrendData {
  /** Percentage change (e.g., 12.5 for +12.5%, -5.2 for -5.2%) */
  percentage: number;
  /** Comparison period label (e.g., "vs last month", "from previous year") */
  comparedTo?: string;
  /** Invert colors (useful for expenses where down is good) */
  invertColors?: boolean;
}

export interface FinancialSummaryCardProps {
  /** Card title (e.g., "Total Revenue", "Monthly Payroll") */
  title: string;
  /** The monetary amount to display */
  amount: number | null | undefined;
  /** Currency code (default: 'QAR') */
  currency?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon name */
  icon?: FinancialCardIcon;
  /** Custom icon component (overrides icon name) */
  customIcon?: ReactNode;
  /** Card variant for styling */
  variant?: FinancialCardVariant;
  /** Optional trend data for comparison */
  trend?: TrendData;
  /** Optional link to navigate to */
  href?: string;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Loading state */
  loading?: boolean;
  /** Compact mode for smaller cards */
  compact?: boolean;
}

/**
 * Financial Summary Card component for displaying monetary metrics.
 * Features built-in currency formatting and optional trend indicators.
 *
 * @example
 * // Basic usage
 * <FinancialSummaryCard
 *   title="Total Revenue"
 *   amount={125000}
 *   currency="QAR"
 *   icon="dollar-sign"
 * />
 *
 * @example
 * // With trend indicator
 * <FinancialSummaryCard
 *   title="Monthly Payroll"
 *   amount={45000}
 *   currency="QAR"
 *   icon="wallet"
 *   variant="info"
 *   trend={{ percentage: 5.2, comparedTo: "vs last month" }}
 * />
 *
 * @example
 * // For expenses (down is good)
 * <FinancialSummaryCard
 *   title="Operating Costs"
 *   amount={18500}
 *   variant="danger"
 *   trend={{ percentage: -8.5, comparedTo: "vs last quarter", invertColors: true }}
 * />
 */
export function FinancialSummaryCard({
  title,
  amount,
  currency = 'QAR',
  subtitle,
  icon,
  customIcon,
  variant = 'default',
  trend,
  href,
  onClick,
  className,
  loading = false,
  compact = false,
}: FinancialSummaryCardProps) {
  const styles = variantStyles[variant];
  const IconComponent = icon ? iconMap[icon] : null;

  // Format the amount
  const formattedAmount = formatCurrency(amount, currency);

  // Determine trend direction and icon
  const getTrendInfo = () => {
    if (!trend) return null;

    const { percentage, comparedTo, invertColors } = trend;
    const isPositive = percentage > 0;
    const isNegative = percentage < 0;
    const isNeutral = percentage === 0;

    // Determine color based on direction and inversion
    let colorClass: string;
    if (isNeutral) {
      colorClass = 'text-slate-500';
    } else if (invertColors) {
      // For expenses: down is good (green), up is bad (red)
      colorClass = isPositive ? styles.trend.down : styles.trend.up;
    } else {
      // For revenue: up is good (green), down is bad (red)
      colorClass = isPositive ? styles.trend.up : styles.trend.down;
    }

    const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const sign = isPositive ? '+' : '';

    return {
      icon: TrendIcon,
      colorClass,
      text: `${sign}${percentage.toFixed(1)}%`,
      comparedTo,
    };
  };

  const trendInfo = getTrendInfo();

  const cardContent = (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl transition-all duration-200',
        compact ? 'p-3' : 'p-4',
        (href || onClick) && 'hover:border-slate-300 hover:shadow-md cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {(IconComponent || customIcon) && (
            <div className={cn('rounded-lg flex items-center justify-center', styles.icon, compact ? 'w-8 h-8' : 'w-10 h-10')}>
              {customIcon || (IconComponent && <IconComponent className={compact ? 'h-4 w-4' : 'h-5 w-5'} />)}
            </div>
          )}
          <div>
            <p className={cn('font-medium text-slate-700', compact ? 'text-xs' : 'text-sm')}>{title}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-2">
        {loading ? (
          <div className={cn('bg-slate-200 rounded animate-pulse', compact ? 'h-6 w-24' : 'h-8 w-32')} />
        ) : (
          <p className={cn('font-bold text-slate-900', compact ? 'text-xl' : 'text-2xl')}>
            {formattedAmount}
          </p>
        )}
      </div>

      {/* Trend indicator */}
      {trendInfo && !loading && (
        <div className={cn('flex items-center gap-1 mt-2', trendInfo.colorClass)}>
          <trendInfo.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{trendInfo.text}</span>
          {trendInfo.comparedTo && (
            <span className="text-xs text-slate-500 ml-1">{trendInfo.comparedTo}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{cardContent}</Link>;
  }

  return cardContent;
}

export interface FinancialSummaryGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

/**
 * Grid container for financial summary cards.
 * Provides responsive column layouts.
 *
 * @example
 * <FinancialSummaryGrid columns={3}>
 *   <FinancialSummaryCard title="Revenue" amount={100000} />
 *   <FinancialSummaryCard title="Expenses" amount={45000} />
 *   <FinancialSummaryCard title="Profit" amount={55000} />
 * </FinancialSummaryGrid>
 */
export function FinancialSummaryGrid({ children, columns = 3, className }: FinancialSummaryGridProps) {
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4', colsClass[columns], className)}>
      {children}
    </div>
  );
}
