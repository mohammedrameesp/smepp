/**
 * @file server-pagination.tsx
 * @description URL-based pagination controls for server-rendered pages
 * @module components/ui
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/core/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export interface ServerPaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Base URL path (e.g., "/admin/payroll/loans") */
  baseUrl: string;
  /** Additional URL params to preserve when paginating */
  preserveParams?: Record<string, string | number | undefined>;
  /** Page param name (default: "p") */
  pageParam?: string;
  /** Additional className for the container */
  className?: string;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Show page info text */
  showPageInfo?: boolean;
}

/**
 * Builds a pagination URL with query parameters
 */
function buildPageUrl(
  baseUrl: string,
  page: number,
  pageParam: string,
  preserveParams?: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();

  // Add preserved params
  if (preserveParams) {
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && key !== pageParam) {
        params.set(key, String(value));
      }
    });
  }

  // Add page param (only if not page 1)
  if (page > 1) {
    params.set(pageParam, String(page));
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * URL-based pagination controls for server-rendered list pages.
 * Uses Link components for navigation without client-side state.
 *
 * @example
 * ```tsx
 * <ServerPagination
 *   page={currentPage}
 *   totalPages={totalPages}
 *   baseUrl="/admin/employees"
 * />
 * ```
 *
 * @example
 * // With preserved filter params
 * ```tsx
 * <ServerPagination
 *   page={page}
 *   totalPages={totalPages}
 *   baseUrl="/admin/payroll/loans"
 *   preserveParams={{ status: statusFilter, q: searchQuery }}
 *   showFirstLast
 * />
 * ```
 */
export function ServerPagination({
  page,
  totalPages,
  baseUrl,
  preserveParams,
  pageParam = 'p',
  className,
  showFirstLast = false,
  showPageInfo = true,
}: ServerPaginationProps) {
  // Don't render if only one page
  if (totalPages <= 1) {
    return null;
  }

  const isFirstPage = page === 1;
  const isLastPage = page === totalPages;

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {/* First page button */}
      {showFirstLast && (
        <Button
          asChild={!isFirstPage}
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={isFirstPage}
          aria-label="First page"
        >
          {isFirstPage ? (
            <span>
              <ChevronsLeft className={ICON_SIZES.sm} />
            </span>
          ) : (
            <Link href={buildPageUrl(baseUrl, 1, pageParam, preserveParams)}>
              <ChevronsLeft className={ICON_SIZES.sm} />
            </Link>
          )}
        </Button>
      )}

      {/* Previous button */}
      <Button
        asChild={!isFirstPage}
        variant="outline"
        size="sm"
        disabled={isFirstPage}
      >
        {isFirstPage ? (
          <span className="flex items-center gap-1">
            <ChevronLeft className={ICON_SIZES.sm} />
            Previous
          </span>
        ) : (
          <Link
            href={buildPageUrl(baseUrl, page - 1, pageParam, preserveParams)}
            className="flex items-center gap-1"
          >
            <ChevronLeft className={ICON_SIZES.sm} />
            Previous
          </Link>
        )}
      </Button>

      {/* Page info */}
      {showPageInfo && (
        <span className="px-3 py-2 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
      )}

      {/* Next button */}
      <Button
        asChild={!isLastPage}
        variant="outline"
        size="sm"
        disabled={isLastPage}
      >
        {isLastPage ? (
          <span className="flex items-center gap-1">
            Next
            <ChevronRight className={ICON_SIZES.sm} />
          </span>
        ) : (
          <Link
            href={buildPageUrl(baseUrl, page + 1, pageParam, preserveParams)}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className={ICON_SIZES.sm} />
          </Link>
        )}
      </Button>

      {/* Last page button */}
      {showFirstLast && (
        <Button
          asChild={!isLastPage}
          variant="outline"
          size="icon"
          className="h-8 w-8"
          disabled={isLastPage}
          aria-label="Last page"
        >
          {isLastPage ? (
            <span>
              <ChevronsRight className={ICON_SIZES.sm} />
            </span>
          ) : (
            <Link href={buildPageUrl(baseUrl, totalPages, pageParam, preserveParams)}>
              <ChevronsRight className={ICON_SIZES.sm} />
            </Link>
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * Simple previous/next pagination (no page numbers)
 */
export function SimplePaginationLinks({
  page,
  hasMore,
  baseUrl,
  preserveParams,
  pageParam = 'p',
  className,
}: {
  page: number;
  hasMore: boolean;
  baseUrl: string;
  preserveParams?: Record<string, string | number | undefined>;
  pageParam?: string;
  className?: string;
}) {
  const isFirstPage = page === 1;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="text-sm text-muted-foreground">Page {page}</div>
      <div className="flex gap-2">
        <Button
          asChild={!isFirstPage}
          variant="outline"
          size="sm"
          disabled={isFirstPage}
        >
          {isFirstPage ? (
            <span>Previous</span>
          ) : (
            <Link href={buildPageUrl(baseUrl, page - 1, pageParam, preserveParams)}>
              Previous
            </Link>
          )}
        </Button>
        <Button
          asChild={hasMore}
          variant="outline"
          size="sm"
          disabled={!hasMore}
        >
          {!hasMore ? (
            <span>Next</span>
          ) : (
            <Link href={buildPageUrl(baseUrl, page + 1, pageParam, preserveParams)}>
              Next
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Pagination info display (without controls)
 */
export function PaginationInfo({
  page,
  pageSize,
  total,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      Showing {start} - {end} of {total}
    </div>
  );
}
