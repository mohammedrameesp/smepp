/**
 * @file subscription-list-table.tsx
 * @description Table component with client-side filtering for subscriptions
 * @module features/subscriptions/components/data-tables
 *
 * Features:
 * - Instant client-side filtering (no loading spinner)
 * - Search across service name, subscription tag, category, account ID
 * - Status, Category, and Billing Cycle filters
 * - Sortable columns
 * - Client-side pagination (50 per page)
 * - Real-time renewal status indicators
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TableFilterBar } from '@/components/ui/table-filter-bar';
import { useClientDataTable } from '@/hooks/use-client-data-table';
import { SubscriptionActions } from '../subscription-actions';
import { formatDate } from '@/lib/core/datetime';
import { formatBillingCycle, getNextRenewalDate, getDaysUntilRenewal } from '@/features/subscriptions';
import { formatCurrency } from '@/lib/core/currency';
import { Package } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';

const PAGE_SIZE = 50;

export interface SubscriptionListItem {
  id: string;
  subscriptionTag: string | null;
  serviceName: string;
  category: string | null;
  accountId: string | null;
  billingCycle: string;
  costPerCycle: string | null;
  costCurrency: string | null;
  status: string;
  purchaseDate: Date | null;
  renewalDate: Date | null;
  paymentMethod: string | null;
  assignedMember: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

type SubscriptionFilters = {
  status: string;
  category: string;
  billingCycle: string;
  [key: string]: string;
};

interface SubscriptionListTableProps {
  subscriptions: SubscriptionListItem[];
}

export function SubscriptionListTable({ subscriptions }: SubscriptionListTableProps) {
  const [page, setPage] = useState(1);

  // Get unique values for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const categories = new Map<string, number>();
    subscriptions.forEach(s => {
      if (s.category) {
        categories.set(s.category, (categories.get(s.category) || 0) + 1);
      }
    });
    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
  }, [subscriptions]);

  const uniqueBillingCycles = useMemo(() => {
    const cycles = new Map<string, number>();
    subscriptions.forEach(s => {
      if (s.billingCycle) {
        cycles.set(s.billingCycle, (cycles.get(s.billingCycle) || 0) + 1);
      }
    });
    return Array.from(cycles.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([billingCycle, count]) => ({ billingCycle, count }));
  }, [subscriptions]);

  // Client-side filtering
  const {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    resetFilters,
    sortBy,
    sortOrder,
    toggleSort,
  } = useClientDataTable<SubscriptionListItem, SubscriptionFilters>({
    data: subscriptions,
    searchFields: ['serviceName', 'subscriptionTag', 'category', 'accountId'],
    defaultSort: 'serviceName',
    defaultOrder: 'asc',
    initialFilters: { status: 'all', category: 'all', billingCycle: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;

      if (key === 'status') {
        return item.status === value;
      }

      if (key === 'category') {
        return item.category === value;
      }

      if (key === 'billingCycle') {
        return item.billingCycle === value;
      }

      return true;
    },
  });

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, page]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = <K extends keyof SubscriptionFilters>(key: K, value: SubscriptionFilters[K]) => {
    setFilter(key, value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleResetFilters = () => {
    resetFilters();
    setPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || filters.status !== 'all' || filters.category !== 'all' || filters.billingCycle !== 'all';

  // Status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">Active</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 border-red-300 text-xs">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search subscriptions..."
        resultCount={filteredData.length}
        totalCount={subscriptions.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((opt) => (
              <SelectItem key={opt.category} value={opt.category}>
                {opt.category} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.billingCycle} onValueChange={(v) => handleFilterChange('billingCycle', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cycles</SelectItem>
            {uniqueBillingCycles.map((opt) => (
              <SelectItem key={opt.billingCycle} value={opt.billingCycle}>
                {formatBillingCycle(opt.billingCycle)} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableFilterBar>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[180px]"
                onClick={() => toggleSort('serviceName')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'serviceName' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('serviceName')}
              >
                Service {sortBy === 'serviceName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="w-[160px]">Account</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[110px]"
                onClick={() => toggleSort('costPerCycle')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'costPerCycle' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('costPerCycle')}
              >
                Cost {sortBy === 'costPerCycle' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[110px]"
                onClick={() => toggleSort('renewalDate')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'renewalDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('renewalDate')}
              >
                Renewal {sortBy === 'renewalDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="w-[140px]">Assigned To</TableHead>
              <TableHead className="text-center w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Package className={cn(ICON_SIZES['2xl'], 'mx-auto text-gray-300 mb-2')} />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No subscriptions match your filters'
                      : 'No subscriptions found. Create your first subscription!'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((subscription) => {
                // Calculate renewal info
                let renewalColorClass = 'text-gray-900';
                let daysText = '';
                let nextRenewal: Date | null = null;

                if (subscription.status !== 'CANCELLED' && subscription.renewalDate) {
                  nextRenewal = getNextRenewalDate(subscription.renewalDate, subscription.billingCycle);
                  const daysUntil = getDaysUntilRenewal(nextRenewal);

                  if (daysUntil !== null) {
                    if (daysUntil < 0) {
                      renewalColorClass = 'text-red-600 font-medium';
                      daysText = `${Math.abs(daysUntil)}d overdue`;
                    } else if (daysUntil === 0) {
                      renewalColorClass = 'text-red-600 font-medium';
                      daysText = 'Due today';
                    } else if (daysUntil <= 7) {
                      renewalColorClass = 'text-orange-600 font-medium';
                      daysText = `${daysUntil}d left`;
                    } else if (daysUntil <= 30) {
                      renewalColorClass = 'text-yellow-600 font-medium';
                      daysText = `${daysUntil}d left`;
                    } else {
                      daysText = `${daysUntil}d left`;
                    }
                  }
                }

                return (
                  <TableRow key={subscription.id}>
                    {/* Column 1: Service + Tag + Category */}
                    <TableCell>
                      <Link
                        href={`/admin/subscriptions/${subscription.id}`}
                        className="font-medium text-sm text-blue-600 hover:underline"
                      >
                        {subscription.serviceName}
                      </Link>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {subscription.subscriptionTag && (
                          <span className="font-mono">{subscription.subscriptionTag}</span>
                        )}
                        {subscription.subscriptionTag && subscription.category && (
                          <span className="mx-1">•</span>
                        )}
                        {subscription.category && <span>{subscription.category}</span>}
                      </div>
                    </TableCell>

                    {/* Column 2: Account */}
                    <TableCell>
                      <div className="text-sm truncate" title={subscription.accountId || undefined}>
                        {subscription.accountId || <span className="text-gray-400">-</span>}
                      </div>
                    </TableCell>

                    {/* Column 3: Status + Billing */}
                    <TableCell>
                      {getStatusBadge(subscription.status)}
                      <div className="text-xs text-gray-500 mt-1">
                        {formatBillingCycle(subscription.billingCycle)}
                      </div>
                    </TableCell>

                    {/* Column 4: Cost + Payment */}
                    <TableCell>
                      <div className="text-sm font-medium">
                        {subscription.costPerCycle && !isNaN(Number(subscription.costPerCycle)) ? (
                          formatCurrency(Number(subscription.costPerCycle), subscription.costCurrency)
                        ) : <span className="text-gray-400">-</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {subscription.paymentMethod ? (
                          <span>•••• {subscription.paymentMethod.slice(-4)}</span>
                        ) : (
                          <span className="text-gray-400">No payment</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Column 5: Renewal + Days */}
                    <TableCell>
                      {subscription.status === 'CANCELLED' ? (
                        <span className="text-gray-400 text-xs">-</span>
                      ) : nextRenewal ? (
                        <div className={`text-xs ${renewalColorClass}`}>
                          <div>{formatDate(nextRenewal)}</div>
                          {daysText && (
                            <div className="text-[10px] mt-0.5 opacity-90">{daysText}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </TableCell>

                    {/* Column 6: Assigned To */}
                    <TableCell>
                      {subscription.assignedMember ? (
                        <Link
                          href={`/admin/users/${subscription.assignedMember.id}`}
                          className="text-sm hover:text-blue-600"
                        >
                          {subscription.assignedMember.name || subscription.assignedMember.email}
                        </Link>
                      ) : (
                        <span className="text-gray-400 text-sm">Unassigned</span>
                      )}
                    </TableCell>

                    {/* Column 7: Actions */}
                    <TableCell>
                      <SubscriptionActions subscriptionId={subscription.id} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
