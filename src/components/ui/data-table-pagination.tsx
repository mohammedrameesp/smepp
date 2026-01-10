/**
 * @file data-table-pagination.tsx
 * @description Pagination controls for data tables
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';

export interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  loading?: boolean;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showInfo?: boolean;
  className?: string;
}

/**
 * Pagination controls for data tables.
 * Shows page navigation, current position, and optional page size selector.
 *
 * @example
 * ```tsx
 * <DataTablePagination
 *   page={pagination.page}
 *   totalPages={pagination.totalPages}
 *   total={pagination.total}
 *   pageSize={pagination.pageSize}
 *   onPageChange={goToPage}
 *   onPageSizeChange={setPageSize}
 *   loading={loading}
 * />
 * ```
 */
export function DataTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showInfo = true,
  className,
}: DataTablePaginationProps) {
  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  if (totalPages <= 1 && !showInfo) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Info section */}
      <div className="flex items-center gap-4">
        {showInfo && (
          <div className="text-sm text-gray-600">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              <>
                Showing {startItem} - {endItem} of {total}
              </>
            )}
          </div>
        )}

        {showPageSize && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Navigation section */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 mr-2">
            Page {page} of {totalPages}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(1)}
            disabled={page === 1 || loading}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || loading}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages || loading}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Simplified pagination for smaller tables
 */
export function SimplePagination({
  page,
  totalPages,
  hasMore,
  onPageChange,
  loading,
  className,
}: {
  page: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
}) {
  const showNext = hasMore !== undefined ? hasMore : (totalPages ? page < totalPages : false);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="text-sm text-gray-600">
        Page {page}{totalPages ? ` of ${totalPages}` : ''}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!showNext || loading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 * Results counter (standalone)
 */
export function ResultsCount({
  page,
  pageSize,
  total,
  loading,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  className?: string;
}) {
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={cn('flex items-center gap-2 text-sm text-gray-600', className)}>
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          Showing {start} - {end} of {total}
        </>
      )}
    </div>
  );
}
