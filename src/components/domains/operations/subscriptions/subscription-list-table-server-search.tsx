'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SubscriptionActions } from './subscription-actions';
import { formatDate } from '@/lib/date-format';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { Loader2 } from 'lucide-react';

interface Subscription {
  id: string;
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
  assignedUser: {
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
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {/* Categories will be dynamic from data */}
          </SelectContent>
        </Select>
        <Select value={billingFilter} onValueChange={setBillingFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Billing Cycles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Billing Cycles</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="YEARLY">Yearly</SelectItem>
            <SelectItem value="ONE_TIME">One-Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing {subscriptions.length > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} subscriptions
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
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
              <TableHead className="w-[140px]">Account</TableHead>
              <TableHead className="w-[90px]">Billing</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 text-right w-[100px]"
                onClick={() => toggleSort('costPerCycle')}
              >
                Cost {sortBy === 'costPerCycle' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 w-[120px]"
                onClick={() => toggleSort('renewalDate')}
              >
                Renewal {sortBy === 'renewalDate' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="w-[110px]">Payment</TableHead>
              <TableHead className="w-[120px]">Assigned</TableHead>
              <TableHead className="text-center w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading subscriptions...</p>
                </TableCell>
              </TableRow>
            ) : subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {debouncedSearch || statusFilter !== 'all' || categoryFilter !== 'all' || billingFilter !== 'all'
                    ? 'No subscriptions match your filters'
                    : 'No subscriptions found. Create your first subscription!'}
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell className="font-medium">
                    <div className="font-medium text-sm">{subscription.serviceName}</div>
                    {subscription.category && (
                      <div className="text-xs text-gray-500 mt-0.5">{subscription.category}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600 truncate" title={subscription.accountId || undefined}>
                    {subscription.accountId || <span className="text-gray-400">N/A</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{formatBillingCycle(subscription.billingCycle)}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {subscription.costPerCycle ? (
                      `${subscription.costCurrency === 'QAR' ? 'QAR' : '$'} ${Number(subscription.costPerCycle).toFixed(2)}`
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {subscription.status === 'CANCELLED' ? (
                      <span className="text-gray-400 text-xs">Cancelled</span>
                    ) : subscription.renewalDate && subscription.status !== 'PAUSED' ? (() => {
                      const nextRenewal = getNextRenewalDate(subscription.renewalDate, subscription.billingCycle);
                      const daysUntil = getDaysUntilRenewal(nextRenewal);

                      let colorClass = 'text-gray-900';
                      let daysText = '';

                      if (daysUntil !== null) {
                        if (daysUntil < 0) {
                          colorClass = 'text-red-600 font-medium';
                          daysText = `${Math.abs(daysUntil)} days overdue`;
                        } else if (daysUntil === 0) {
                          colorClass = 'text-red-600 font-medium';
                          daysText = 'Due today';
                        } else if (daysUntil <= 7) {
                          colorClass = 'text-orange-600 font-medium';
                          daysText = `Due in ${daysUntil} days`;
                        } else if (daysUntil <= 30) {
                          colorClass = 'text-yellow-600 font-medium';
                          daysText = `Due in ${daysUntil} days`;
                        } else {
                          daysText = `Due in ${daysUntil} days`;
                        }
                      }

                      return (
                        <div className={`text-xs ${colorClass}`}>
                          <div>{formatDate(nextRenewal)}</div>
                          {daysText && (
                            <div className="text-[10px] mt-0.5 opacity-90">
                              {daysText}
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-gray-600">
                    {subscription.paymentMethod ? (
                      <div className="flex items-center gap-1">
                        <span>💳</span>
                        <span>•••• {subscription.paymentMethod.slice(-4)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {subscription.assignedUser ? (
                      <Link
                        href={`/admin/users/${subscription.assignedUser.id}`}
                        className="text-gray-900 hover:text-gray-700 cursor-pointer font-medium"
                      >
                        {subscription.assignedUser.name || 'Unknown User'}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-xs">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <SubscriptionActions subscriptionId={subscription.id} />
                  </TableCell>
                </TableRow>
              ))
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
