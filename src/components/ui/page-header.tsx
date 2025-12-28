import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  };
  children?: React.ReactNode;
}

const badgeVariants = {
  default: 'bg-slate-500/20 text-slate-300',
  success: 'bg-emerald-500/20 text-emerald-400',
  warning: 'bg-amber-500/20 text-amber-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
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
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-sm mb-3">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {badge && (
              <span
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full',
                  badgeVariants[badge.variant || 'default']
                )}
              >
                {badge.text}
              </span>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-slate-400 mt-1">{subtitle}</p>
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
}: {
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  children: React.ReactNode;
  className?: string;
}) {
  const baseStyles = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors';

  const variantStyles = {
    primary: 'bg-white text-slate-900 hover:bg-slate-100',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600',
    outline: 'bg-transparent text-slate-300 hover:text-white border border-slate-500 hover:border-slate-400',
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
    <button onClick={onClick} className={combinedClassName}>
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
    <main className={cn('max-w-6xl mx-auto px-6 py-8', className)}>
      {children}
    </main>
  );
}
