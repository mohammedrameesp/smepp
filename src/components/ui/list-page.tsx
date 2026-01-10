/**
 * @file list-page.tsx
 * @description Standardized layout components for list/table pages
 * @module components/ui
 *
 * Eliminates duplicate page structure across admin list pages.
 * Combines PageHeader, stat chips, and table card into a consistent structure.
 */

import { PageHeader, PageContent } from '@/components/ui/page-header';
import { StatChipGroup, StatChip, type StatConfig } from '@/components/ui/stat-chip';
import { cn } from '@/lib/core/utils';

export interface ListPageProps {
  /** Page title */
  title: string;
  /** Page subtitle/description */
  subtitle?: string;
  /** Stats to display as chips below the header */
  stats?: StatConfig[];
  /** Action buttons (typically "Add New" button) */
  actions?: React.ReactNode;
  /** Table section title */
  tableTitle?: string;
  /** Table section subtitle */
  tableSubtitle?: string;
  /** Table component */
  children: React.ReactNode;
  /** Additional className for the wrapper */
  className?: string;
  /** Whether to show the table card wrapper (default: true) */
  showTableCard?: boolean;
  /** Header actions for the table card (e.g., filter buttons) */
  tableHeaderActions?: React.ReactNode;
}

/**
 * Standardized layout for list/table pages.
 * Combines PageHeader, stat chips, and table card into a consistent structure.
 *
 * @example
 * <ListPage
 *   title="Assets"
 *   subtitle="Manage your organization's assets"
 *   stats={[
 *     { value: 42, label: 'total', color: 'slate' },
 *     { value: 35, label: 'active', color: 'blue' },
 *   ]}
 *   actions={<Button>Add Asset</Button>}
 *   tableTitle="All Assets"
 *   tableSubtitle="View and manage all assets"
 * >
 *   <AssetTable />
 * </ListPage>
 */
export function ListPage({
  title,
  subtitle,
  stats,
  actions,
  tableTitle,
  tableSubtitle,
  children,
  className,
  showTableCard = true,
  tableHeaderActions,
}: ListPageProps) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions}>
        {stats && stats.length > 0 && (
          <StatChipGroup>
            {stats.map((stat, index) => (
              <StatChip key={index} {...stat} />
            ))}
          </StatChipGroup>
        )}
      </PageHeader>

      <PageContent className={className}>
        {showTableCard ? (
          <TableCard
            title={tableTitle}
            subtitle={tableSubtitle}
            headerActions={tableHeaderActions}
          >
            {children}
          </TableCard>
        ) : (
          children
        )}
      </PageContent>
    </>
  );
}

export interface TableCardProps {
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Table or content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Whether to show header (default: true if title provided) */
  showHeader?: boolean;
  /** Header actions (e.g., filter buttons) */
  headerActions?: React.ReactNode;
}

/**
 * Card wrapper for tables with optional header.
 *
 * @example
 * <TableCard title="All Assets" subtitle="View and manage assets">
 *   <AssetTable />
 * </TableCard>
 */
export function TableCard({
  title,
  subtitle,
  children,
  className,
  showHeader,
  headerActions,
}: TableCardProps) {
  const shouldShowHeader = showHeader ?? !!title;

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200', className)}>
      {shouldShowHeader && (
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            {title && <h2 className="font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// Re-export for convenience
export { StatChip, StatChipGroup, type StatConfig } from './stat-chip';
