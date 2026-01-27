/**
 * @file page-header.tsx
 * @description Page header components with breadcrumbs, title, and action buttons
 * @module components/ui
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: {
    text: string;
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'error';
  };
  children?: React.ReactNode;
}

// Map error to destructive for badge component compatibility
const mapBadgeVariant = (variant?: string) => {
  if (variant === 'error') return 'destructive';
  return variant as 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'muted' | undefined;
};

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
  children,
}: PageHeaderProps) {
  return (
    <div className="bg-slate-800 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Breadcrumbs - scrollable on mobile */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs sm:text-sm mb-3 overflow-x-auto scrollbar-hide whitespace-nowrap">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1 shrink-0">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-300">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{title}</h1>
            {badge && (
              <Badge
                variant={mapBadgeVariant(badge.variant) || 'muted'}
                shape="pill"
                className="shrink-0 bg-opacity-20 dark:bg-opacity-30"
              >
                {badge.text}
              </Badge>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">{actions}</div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-slate-400 mt-1 text-sm sm:text-base">{subtitle}</p>
        )}

        {/* Optional children (e.g., summary chips, tabs) */}
        {children}
      </div>
    </div>
  );
}

// Button variants for use in PageHeader actions
export function PageHeaderButton({
  href,
  onClick,
  variant = 'secondary',
  children,
  className,
  disabled,
  type = 'button',
}: {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const baseStyles = 'inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-white',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600 focus-visible:ring-slate-400',
    outline: 'bg-transparent text-slate-300 hover:text-white border border-slate-500 hover:border-slate-400 focus-visible:ring-slate-400',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500',
    warning: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500',
  };

  const combinedClassName = cn(baseStyles, variantStyles[variant], className);

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={combinedClassName} disabled={disabled} type={type}>
      {children}
    </button>
  );
}

// Container for main content below the header
export function PageContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn('max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8', className)}>
      {children}
    </main>
  );
}
