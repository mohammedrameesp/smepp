/**
 * @file empty-table-row.tsx
 * @description Empty state row for tables with no data
 * @module components/ui
 */

import * as React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/core/utils';
import { Inbox, Search, FileX, AlertCircle } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

export type EmptyTableVariant = 'default' | 'search' | 'filter' | 'error';

export interface EmptyTableRowProps {
  /** Number of columns to span */
  colSpan: number;
  /** Message to display */
  message?: string;
  /** Optional subtitle/description */
  description?: string;
  /** Custom icon to display */
  icon?: React.ReactNode;
  /** Variant determines default icon and styling */
  variant?: EmptyTableVariant;
  /** Additional className for the cell */
  className?: string;
}

const variantConfig: Record<
  EmptyTableVariant,
  { icon: React.ReactNode; defaultMessage: string }
> = {
  default: {
    icon: <Inbox className={`${ICON_SIZES.xl} text-muted-foreground/50`} />,
    defaultMessage: 'No data found',
  },
  search: {
    icon: <Search className={`${ICON_SIZES.xl} text-muted-foreground/50`} />,
    defaultMessage: 'No results found',
  },
  filter: {
    icon: <FileX className={`${ICON_SIZES.xl} text-muted-foreground/50`} />,
    defaultMessage: 'No items match your filters',
  },
  error: {
    icon: <AlertCircle className={`${ICON_SIZES.xl} text-destructive/50`} />,
    defaultMessage: 'Failed to load data',
  },
};

/**
 * Empty state row for tables.
 * Use this when a table has no data to display.
 *
 * @example
 * ```tsx
 * <TableBody>
 *   {items.length === 0 ? (
 *     <EmptyTableRow colSpan={5} message="No employees found" />
 *   ) : (
 *     items.map(item => <TableRow key={item.id}>...</TableRow>)
 *   )}
 * </TableBody>
 * ```
 *
 * @example
 * // With search variant
 * ```tsx
 * <EmptyTableRow
 *   colSpan={6}
 *   variant="search"
 *   message="No results for your search"
 *   description="Try adjusting your search terms"
 * />
 * ```
 */
export function EmptyTableRow({
  colSpan,
  message,
  description,
  icon,
  variant = 'default',
  className,
}: EmptyTableRowProps) {
  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;
  const displayMessage = message ?? config.defaultMessage;

  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={cn('h-32 text-center', className)}
      >
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          {displayIcon}
          <p className="text-sm font-medium text-muted-foreground">
            {displayMessage}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground/70">{description}</p>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Simple empty table row without icon (compact variant)
 */
export function EmptyTableRowCompact({
  colSpan,
  message = 'No data found',
  className,
}: {
  colSpan: number;
  message?: string;
  className?: string;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={cn('text-center text-muted-foreground py-8', className)}
      >
        {message}
      </TableCell>
    </TableRow>
  );
}

/**
 * Loading skeleton rows for tables
 */
export function LoadingTableRows({
  colSpan,
  rows = 3,
  className,
}: {
  colSpan: number;
  rows?: number;
  className?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan} className={className}>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
