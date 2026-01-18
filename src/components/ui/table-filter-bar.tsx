/**
 * @file table-filter-bar.tsx
 * @description Reusable filter bar component for data tables with search, filters, and result count
 * @module components/ui
 */
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export interface TableFilterBarProps {
  /** Current search value */
  searchValue: string;
  /** Callback when search changes */
  onSearchChange: (value: string) => void;
  /** Search input placeholder */
  searchPlaceholder?: string;
  /** Number of filtered results */
  resultCount: number;
  /** Total number of items before filtering */
  totalCount: number;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Whether any filters are active (shows clear button) */
  hasActiveFilters?: boolean;
  /** Filter controls (Select components, etc.) */
  children?: React.ReactNode;
  /** Additional class names for the container */
  className?: string;
}

/**
 * Reusable filter bar for data tables.
 * Provides a consistent layout for search, filters, and result count.
 *
 * @example
 * ```tsx
 * <TableFilterBar
 *   searchValue={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   searchPlaceholder="Search assets..."
 *   resultCount={filteredData.length}
 *   totalCount={assets.length}
 *   onClearFilters={resetFilters}
 *   hasActiveFilters={searchTerm !== '' || filters.status !== 'all'}
 * >
 *   <Select value={filters.status} onValueChange={(v) => setFilter('status', v)}>
 *     <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="all">All Statuses</SelectItem>
 *       <SelectItem value="AVAILABLE">Available</SelectItem>
 *     </SelectContent>
 *   </Select>
 * </TableFilterBar>
 * ```
 */
export function TableFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  resultCount,
  totalCount,
  onClearFilters,
  hasActiveFilters = false,
  children,
  className = '',
}: TableFilterBarProps) {
  return (
    <div className={className}>
      {/* Filter controls row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
              aria-label="Clear search"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter dropdowns (passed as children) */}
        {children && (
          <div className="flex flex-wrap gap-3 flex-1">
            {children}
          </div>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Result count */}
      <div className="text-sm text-muted-foreground mb-4">
        Showing {resultCount.toLocaleString()} of {totalCount.toLocaleString()} {totalCount === 1 ? 'item' : 'items'}
        {hasActiveFilters && resultCount !== totalCount && (
          <span className="ml-1">(filtered)</span>
        )}
      </div>
    </div>
  );
}
