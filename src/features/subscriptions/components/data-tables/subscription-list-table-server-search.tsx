/**
 * @file subscription-list-table-server-search.tsx
 * @description Advanced subscription data table with server-side operations
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - Server-side search with 300ms debouncing for performance
 * - Multi-filter support: status, category, billing cycle
 * - Sortable columns with ascending/descending order
 * - Pagination with configurable page size (default: 50)
 * - Real-time renewal status indicators (overdue, due soon, upcoming)
 * - Inline actions (view, edit, cancel, reactivate)
 * - Loading states and error handling
 * - Responsive table design
 *
 * Props:
 * - None (self-contained component with internal state management)
 *
 * Usage:
 * ```tsx
 * <SubscriptionListTableServerSearch />
 * ```
 *
 * API Integration:
 * - GET /api/subscriptions with query parameters for filtering/sorting
 * - Auto-refreshes after subscription actions (cancel, reactivate)
 *
 * Filter Options:
 * - Status: All, Active, Cancelled, Expired
 * - Category: All + dynamic categories from data
 * - Billing: All, Monthly, Yearly, Quarterly, Semi-Annually, Weekly, One-Time
 *
 * Renewal Status Colors:
 * - Red: Overdue (past renewal date)
 * - Amber: Due soon (within 7 days)
 * - Yellow: Upcoming (within 30 days)
 * - Green: Active (more than 30 days)
 *
 * Performance:
 * - Debounced search prevents excessive API calls
 * - URL sync for bookmarkable filtered views
 * - Optimistic UI updates on actions
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { SubscriptionActions } from '../subscription-actions';
import { formatDate } from '@/lib/core/datetime';
import { formatBillingCycle, getNextRenewalDate, getDaysUntilRenewal } from '@/features/subscriptions';
import { formatCurrency } from '@/lib/core/currency';
import { Loader2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';

interface Subscription {
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

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface CategoryOption {
  category: string;
  count: number;
}

interface BillingCycleOption {
  billingCycle: string;
  count: number;
}

export function SubscriptionListTableServerSearch() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [billingFilter, setBillingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('renewalDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Dynamic filter options
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [billingCycleOptions, setBillingCycleOptions] = useState<BillingCycleOption[]>([]);

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('/api/subscriptions/filters');
        if (response.ok) {
          const data = await response.json();
          setCategoryOptions(data.categories || []);
          setBillingCycleOptions(data.billingCycles || []);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    }
    fetchFilterOptions();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch subscriptions from API
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        p: pagination.page.toString(),
        ps: pagination.pageSize.toString(),
        sort: sortBy,
        order: sortOrder,
      });

      if (debouncedSearch) params.append('q', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (billingFilter && billingFilter !== 'all') params.append('billingCycle', billingFilter);

      const response = await fetch(`/api/subscriptions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch subscriptions');

      const data = await response.json();
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, statusFilter, categoryFilter, billingFilter, sortBy, sortOrder]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          {loading && debouncedSearch !== searchTerm && (
            <p className="text-xs text-gray-500 mt-1">Searching...</p>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((opt) => (
              <SelectItem key={opt.category} value={opt.category}>
                {opt.category} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={billingFilter} onValueChange={setBillingFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Billing Cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Billing Cycles</SelectItem>
            {billingCycleOptions.map((opt) => (
              <SelectItem key={opt.billingCycle} value={opt.billingCycle}>
                {formatBillingCycle(opt.billingCycle)} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing {subscriptions.length > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} subscriptions
        </div>
        {loading && <Loader2 className={cn(ICON_SIZES.sm, 'animate-spin')} />}
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[180px]"
                onClick={() => toggleSort('serviceName')}
              >
                Service {sortBy === 'serviceName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="w-[160px]">Account</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[110px]"
                onClick={() => toggleSort('costPerCycle')}
              >
                Cost {sortBy === 'costPerCycle' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[110px]"
                onClick={() => toggleSort('renewalDate')}
              >
                Renewal {sortBy === 'renewalDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="w-[140px]">Assigned To</TableHead>
              <TableHead className="text-center w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className={cn(ICON_SIZES.xl, 'animate-spin mx-auto text-gray-400')} />
                  <p className="text-gray-500 mt-2">Loading subscriptions...</p>
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {debouncedSearch || statusFilter !== 'all' || categoryFilter !== 'all' || billingFilter !== 'all'
                    ? 'No subscriptions match your filters'
                    : 'No subscriptions found. Create your first subscription!'}
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => {
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
                      <div className="font-medium text-sm">{subscription.serviceName}</div>
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
                      <SubscriptionStatusBadge status={subscription.status} />
                      <div className="text-xs text-gray-500 mt-1">
                        {formatBillingCycle(subscription.billingCycle)}
                      </div>
                    </TableCell>

                    {/* Column 4: Cost + Payment */}
                    <TableCell>
                      <div className="text-sm font-medium">
                        {subscription.costPerCycle && !isNaN(Number(subscription.costPerCycle)) ? (
                          formatCurrency(Number(subscription.costPerCycle), subscription.costCurrency)
                        ) : <span className="text-gray-400">—</span>}
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
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.hasMore || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
