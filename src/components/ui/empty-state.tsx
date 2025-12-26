'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, Search, Inbox, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  iconClassName,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-12 px-6',
        className
      )}
      role="status"
      aria-label={title}
    >
      <div
        className={cn(
          'rounded-full flex items-center justify-center mb-4',
          isCompact ? 'w-12 h-12 bg-slate-100' : 'w-16 h-16 bg-slate-100',
          iconClassName
        )}
      >
        <Icon
          className={cn(
            'text-slate-400',
            isCompact ? 'h-6 w-6' : 'h-8 w-8'
          )}
          aria-hidden="true"
        />
      </div>
      <h3
        className={cn(
          'font-semibold text-slate-900 mb-1',
          isCompact ? 'text-sm' : 'text-base'
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'text-slate-600 max-w-sm',
          isCompact ? 'text-xs' : 'text-sm'
        )}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Pre-configured empty states for common scenarios

export function NoResultsState({
  searchTerm,
  onClear,
}: {
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        searchTerm
          ? `No items match "${searchTerm}". Try adjusting your search or filters.`
          : 'No items match your current filters. Try adjusting your criteria.'
      }
      action={
        onClear && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium rounded px-2 py-1"
          >
            Clear filters
          </button>
        )
      }
    />
  );
}

export function NoDataState({
  resourceName,
  actionLabel,
  actionHref,
}: {
  resourceName: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={`No ${resourceName} yet`}
      description={`Get started by adding your first ${resourceName.toLowerCase().replace(/s$/, '')}.`}
      action={
        actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {actionLabel}
          </Link>
        )
      }
    />
  );
}

export function AllCaughtUpState({
  title = "You're all caught up!",
  description = 'No pending items at the moment.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <EmptyState
      icon={CheckCircle2}
      title={title}
      description={description}
      iconClassName="bg-emerald-100"
      className="[&_svg]:text-emerald-500"
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error loading this data.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title={title}
      description={description}
      iconClassName="bg-red-100"
      className="[&_svg]:text-red-500"
      action={
        onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Try again
          </button>
        )
      }
    />
  );
}
