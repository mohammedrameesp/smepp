/**
 * @file subscription-list-table.tsx
 * @description Table component displaying subscriptions with client-side filtering and sorting
 * @module components/domains/operations/subscriptions
 */
'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubscriptionActions } from './subscription-actions';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { formatDate } from '@/lib/date-format';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import Link from 'next/link';

interface Subscription {
  id: string;
  serviceName: string;
  category: string | null;
  accountId: string | null;
  billingCycle: string;
  costPerCycle: number | null;
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

interface SubscriptionListTableProps {
  subscriptions: Subscription[];
}

export function SubscriptionListTable({ subscriptions }: SubscriptionListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [billingFilter, setBillingFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('renewalDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique statuses and billing cycles for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(subscriptions.map(s => s.status))).sort();
  }, [subscriptions]);

  const uniqueBillingCycles = useMemo(() => {
    return Array.from(new Set(subscriptions.map(s => s.billingCycle))).sort();
  }, [subscriptions]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(subscriptions.map(s => s.category).filter(Boolean))).sort() as string[];
  }, [subscriptions]);

  // Filter and sort subscriptions
  const filteredAndSortedSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(sub =>
        sub.serviceName.toLowerCase().includes(term) ||
        sub.category?.toLowerCase().includes(term) ||
        sub.accountId?.toLowerCase().includes(term) ||
        sub.assignedUser?.name?.toLowerCase().includes(term) ||
        sub.assignedUser?.email?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Apply billing cycle filter
    if (billingFilter !== 'all') {
      filtered = filtered.filter(sub => sub.billingCycle === billingFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(sub => sub.category === categoryFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      // Always put cancelled subscriptions at the end
      if (a.status === 'CANCELLED' && b.status !== 'CANCELLED') return 1;
      if (a.status !== 'CANCELLED' && b.status === 'CANCELLED') return -1;

      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'serviceName':
          aValue = a.serviceName.toLowerCase();
          bValue = b.serviceName.toLowerCase();
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || 'zzz';
          bValue = b.category?.toLowerCase() || 'zzz';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'billingCycle':
          aValue = a.billingCycle;
          bValue = b.billingCycle;
          break;
        case 'cost':
          aValue = a.costPerCycle || 0;
          bValue = b.costPerCycle || 0;
          break;
        case 'purchaseDate':
          // Use Infinity for null dates so they always sort to the end
          aValue = a.purchaseDate ? new Date(a.purchaseDate).getTime() : Infinity;
          bValue = b.purchaseDate ? new Date(b.purchaseDate).getTime() : Infinity;
          break;
        case 'renewalDate':
          // Sort by calculated next renewal date (considering billing cycle)
          // Cancelled subscriptions always go to the end
          if (a.status === 'CANCELLED') {
            aValue = Infinity;
          } else if (a.renewalDate && a.billingCycle !== 'ONE_TIME') {
            const nextRenewalA = getNextRenewalDate(a.renewalDate, a.billingCycle);
            aValue = getDaysUntilRenewal(nextRenewalA) ?? Infinity;
          } else {
            aValue = Infinity;
          }

          if (b.status === 'CANCELLED') {
            bValue = Infinity;
          } else if (b.renewalDate && b.billingCycle !== 'ONE_TIME') {
            const nextRenewalB = getNextRenewalDate(b.renewalDate, b.billingCycle);
            bValue = getDaysUntilRenewal(nextRenewalB) ?? Infinity;
          } else {
            bValue = Infinity;
          }
          break;
        case 'assignedUser':
          aValue = a.assignedUser?.name || a.assignedUser?.email || 'zzz';
          bValue = b.assignedUser?.name || b.assignedUser?.email || 'zzz';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [subscriptions, searchTerm, statusFilter, billingFilter, categoryFilter, sortBy, sortOrder]);

  // Get renewal status with color coding
  const getRenewalStatus = (subscription: Subscription) => {
    if (subscription.status === 'CANCELLED') {
      return { label: 'Cancelled', color: 'bg-gray-100 text-gray-700 border-gray-300' };
    }

    if (!subscription.renewalDate || subscription.billingCycle === 'ONE_TIME') {
      return { label: 'Active', color: 'bg-green-50 text-green-700 border-green-300' };
    }

    const nextRenewal = getNextRenewalDate(subscription.renewalDate, subscription.billingCycle);
    const daysUntil = getDaysUntilRenewal(nextRenewal);

    if (daysUntil === null) {
      return { label: 'Active', color: 'bg-green-50 text-green-700 border-green-300' };
    }

    if (daysUntil < 0) {
      return { label: 'Overdue', color: 'bg-red-50 text-red-700 border-red-300' };
    } else if (daysUntil === 0) {
      return { label: 'Due Today', color: 'bg-red-50 text-red-700 border-red-300' };
    } else if (daysUntil <= 7) {
      return { label: 'Due This Week', color: 'bg-orange-50 text-orange-700 border-orange-300' };
    } else if (daysUntil <= 30) {
      return { label: 'Due This Month', color: 'bg-yellow-50 text-yellow-700 border-yellow-300' };
    } else {
      return { label: 'Active', color: 'bg-green-50 text-green-700 border-green-300' };
    }
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <Input
            placeholder="Search subscriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={billingFilter} onValueChange={setBillingFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Billing Cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Billing Cycles</SelectItem>
              {uniqueBillingCycles.map(cycle => (
                <SelectItem key={cycle} value={cycle}>{formatBillingCycle(cycle)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchaseDate">Purchase Date</SelectItem>
              <SelectItem value="serviceName">Service Name</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="billingCycle">Billing Cycle</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="renewalDate">Renewal Date</SelectItem>
              <SelectItem value="assignedUser">Assigned To</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredAndSortedSubscriptions.length} of {subscriptions.length} subscriptions
      </div>

      {/* Table */}
      {filteredAndSortedSubscriptions.length > 0 ? (
        <div className="overflow-x-auto">
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
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 w-[90px]"
                  onClick={() => toggleSort('billingCycle')}
                >
                  Billing {sortBy === 'billingCycle' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 text-right w-[100px]"
                  onClick={() => toggleSort('cost')}
                >
                  Cost {sortBy === 'cost' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 w-[120px]"
                  onClick={() => toggleSort('renewalDate')}
                >
                  Renewal {sortBy === 'renewalDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-[110px]">Payment</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100 w-[120px]"
                  onClick={() => toggleSort('assignedUser')}
                >
                  Assigned {sortBy === 'assignedUser' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSubscriptions.map((subscription) => (
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
                      `${subscription.costCurrency === 'QAR' ? 'QAR' : '$'} ${subscription.costPerCycle.toFixed(2)}`
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
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No subscriptions found matching your filters
        </div>
      )}
    </div>
  );
}
