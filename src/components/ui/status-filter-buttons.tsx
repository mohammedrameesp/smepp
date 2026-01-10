/**
 * @file status-filter-buttons.tsx
 * @description URL-based status filter buttons for list pages
 * @module components/ui
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/core/utils';

export interface StatusFilterButtonsProps<T extends string> {
  /** Current filter value (null for "All") */
  currentFilter: T | null | undefined;
  /** Base URL path (e.g., "/admin/payroll/loans") */
  baseUrl: string;
  /** Array of status values to display as filter options */
  statuses: readonly T[] | T[];
  /** Custom label formatter for status values */
  getLabel?: (status: T) => string;
  /** Label for the "All" button */
  allLabel?: string;
  /** Additional URL params to preserve when filtering */
  preserveParams?: Record<string, string | number | undefined>;
  /** Additional className for the container */
  className?: string;
  /** Size variant for buttons */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Builds a URL with query parameters
 */
function buildFilterUrl(
  baseUrl: string,
  status: string | null,
  preserveParams?: Record<string, string | number | undefined>
): string {
  const params = new URLSearchParams();

  // Add preserved params
  if (preserveParams) {
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && key !== 'status') {
        params.set(key, String(value));
      }
    });
  }

  // Add status param if not "All"
  if (status) {
    params.set('status', status);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Default label formatter that converts SCREAMING_SNAKE_CASE to Title Case
 */
function defaultGetLabel(status: string): string {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Status filter buttons for list pages.
 * Renders a row of buttons that filter by status using URL params.
 *
 * @example
 * ```tsx
 * <StatusFilterButtons
 *   currentFilter={statusFilter}
 *   baseUrl="/admin/payroll/loans"
 *   statuses={['PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED']}
 * />
 * ```
 *
 * @example
 * // With custom labels and preserved params
 * ```tsx
 * <StatusFilterButtons
 *   currentFilter={statusFilter}
 *   baseUrl="/admin/assets"
 *   statuses={Object.values(AssetStatus)}
 *   getLabel={(s) => assetStatusLabels[s]}
 *   preserveParams={{ category: selectedCategory }}
 * />
 * ```
 */
export function StatusFilterButtons<T extends string>({
  currentFilter,
  baseUrl,
  statuses,
  getLabel = defaultGetLabel as (status: T) => string,
  allLabel = 'All',
  preserveParams,
  className,
  size = 'sm',
}: StatusFilterButtonsProps<T>) {
  const isAllSelected = !currentFilter;

  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {/* "All" button */}
      <Button
        asChild
        variant={isAllSelected ? 'default' : 'outline'}
        size={size}
      >
        <Link href={buildFilterUrl(baseUrl, null, preserveParams)}>
          {allLabel}
        </Link>
      </Button>

      {/* Status buttons */}
      {statuses.map((status) => (
        <Button
          key={status}
          asChild
          variant={currentFilter === status ? 'default' : 'outline'}
          size={size}
        >
          <Link href={buildFilterUrl(baseUrl, status, preserveParams)}>
            {getLabel(status)}
          </Link>
        </Button>
      ))}
    </div>
  );
}

/**
 * Props for a single filter option (for custom filter groups)
 */
export interface FilterOption<T extends string = string> {
  value: T | null;
  label: string;
}

/**
 * Generic filter buttons that work with any filter options.
 * More flexible than StatusFilterButtons for non-status filters.
 *
 * @example
 * ```tsx
 * <FilterButtons
 *   currentValue={categoryFilter}
 *   baseUrl="/admin/assets"
 *   paramName="category"
 *   options={[
 *     { value: null, label: 'All Categories' },
 *     { value: 'electronics', label: 'Electronics' },
 *     { value: 'furniture', label: 'Furniture' },
 *   ]}
 * />
 * ```
 */
export function FilterButtons<T extends string>({
  currentValue,
  baseUrl,
  paramName,
  options,
  preserveParams,
  className,
  size = 'sm',
}: {
  currentValue: T | null | undefined;
  baseUrl: string;
  paramName: string;
  options: FilterOption<T>[];
  preserveParams?: Record<string, string | number | undefined>;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}) {
  function buildUrl(value: T | null): string {
    const params = new URLSearchParams();

    if (preserveParams) {
      Object.entries(preserveParams).forEach(([key, val]) => {
        if (val !== undefined && val !== '' && key !== paramName) {
          params.set(key, String(val));
        }
      });
    }

    if (value) {
      params.set(paramName, value);
    }

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {options.map((option) => (
        <Button
          key={option.value ?? 'all'}
          asChild
          variant={currentValue === option.value ? 'default' : 'outline'}
          size={size}
        >
          <Link href={buildUrl(option.value)}>
            {option.label}
          </Link>
        </Button>
      ))}
    </div>
  );
}
