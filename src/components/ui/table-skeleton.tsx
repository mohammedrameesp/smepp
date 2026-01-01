/**
 * @file table-skeleton.tsx
 * @description Skeleton loader components for table and page loading states
 * @module components/ui
 */

'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
}

/**
 * Skeleton loader for table content.
 * Displays animated placeholder rows matching table structure.
 */
export function TableSkeleton({
  columns = 5,
  rows = 5,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="w-full">
      {/* Table header skeleton */}
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/50">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? '200px' : i === columns - 1 ? '80px' : '150px' }}
            />
          ))}
        </div>
      )}
      {/* Table rows skeleton */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex gap-4 p-4 items-center">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={`cell-${rowIndex}-${colIndex}`}
                className="h-4 flex-1"
                style={{ maxWidth: colIndex === 0 ? '200px' : colIndex === columns - 1 ? '80px' : '150px' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for page with header and table.
 * Matches PageHeader/PageContent layout pattern.
 */
export function PageWithTableSkeleton({
  title = true,
  actions = true,
  filters = true,
  columns = 5,
  rows = 8,
}: {
  title?: boolean;
  actions?: boolean;
  filters?: boolean;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header Skeleton - matches PageHeader component */}
      <div className="bg-slate-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              {title && <Skeleton className="h-7 w-48 mb-2 bg-slate-700" />}
              <Skeleton className="h-4 w-64 bg-slate-700" />
            </div>
            {actions && (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 bg-slate-700 rounded-lg" />
                <Skeleton className="h-9 w-32 bg-slate-700 rounded-lg" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Content - matches PageContent component */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Filters/search bar */}
        {filters && (
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        )}

        {/* Table card */}
        <div className="border rounded-lg bg-card">
          <TableSkeleton columns={columns} rows={rows} />
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Skeleton for detail/form pages.
 * Matches PageHeader/PageContent layout pattern.
 */
export function PageDetailSkeleton({
  sections = 3,
  fieldsPerSection = 4,
}: {
  sections?: number;
  fieldsPerSection?: number;
}) {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Page Header Skeleton - matches PageHeader component */}
      <div className="bg-slate-800 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <Skeleton className="h-7 w-48 mb-2 bg-slate-700" />
              <Skeleton className="h-4 w-32 bg-slate-700" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 bg-slate-700 rounded-lg" />
              <Skeleton className="h-9 w-24 bg-slate-700 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Page Content - matches PageContent component */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Content sections */}
        {Array.from({ length: sections }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="border rounded-lg bg-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: fieldsPerSection }).map((_, fieldIndex) => (
                <div key={fieldIndex}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
