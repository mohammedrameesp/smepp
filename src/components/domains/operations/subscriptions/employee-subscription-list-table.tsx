'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/date-format';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';
import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';

interface Subscription {
  id: string;
  serviceName: string;
  category: string | null;
  vendor: string | null;
  billingCycle: string;
  costPerCycle: number | null;
  costCurrency: string | null;
  status: string;
  purchaseDate: Date | null;
  renewalDate: Date | null;
  assignedUserId: string | null;
  assignedUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface EmployeeSubscriptionListTableProps {
  subscriptions: Subscription[];
  currentUserId: string;
}

export function EmployeeSubscriptionListTable({ subscriptions, currentUserId }: EmployeeSubscriptionListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('purchaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique categories and statuses for filters
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(subscriptions.map(s => s.category).filter(Boolean))).sort() as string[];
  }, [subscriptions]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(subscriptions.map(s => s.status))).sort();
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
        sub.vendor?.toLowerCase().includes(term) ||
        sub.assignedUser?.name?.toLowerCase().includes(term) ||
        sub.assignedUser?.email?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(sub => sub.category === categoryFilter);
    }

    // Apply assignment filter
    if (assignmentFilter === 'mine') {
      filtered = filtered.filter(sub => sub.assignedUserId === currentUserId);
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(sub => !sub.assignedUserId);
    } else if (assignmentFilter === 'others') {
      filtered = filtered.filter(sub => sub.assignedUserId && sub.assignedUserId !== currentUserId);
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
        case 'assignedUser':
          aValue = a.assignedUser?.name || a.assignedUser?.email || 'zzz';
          bValue = b.assignedUser?.name || b.assignedUser?.email || 'zzz';
          break;
        case 'purchaseDate':
          aValue = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
          bValue = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
          break;
        case 'renewalDate':
          aValue = a.renewalDate ? new Date(a.renewalDate).getTime() : 0;
          bValue = b.renewalDate ? new Date(b.renewalDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [subscriptions, searchTerm, statusFilter, categoryFilter, assignmentFilter, sortBy, sortOrder, currentUserId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRenewalBadge = (subscription: Subscription) => {
    if (subscription.status === 'CANCELLED' || subscription.status === 'PAUSED') {
      return null;
    }

    if (!subscription.renewalDate || subscription.billingCycle === 'ONE_TIME') {
      return null;
    }

    const nextRenewal = getNextRenewalDate(subscription.renewalDate, subscription.billingCycle);
    const daysUntil = getDaysUntilRenewal(nextRenewal);

    if (daysUntil === null) return null;

    if (daysUntil < 0) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    } else if (daysUntil === 0) {
      return <Badge className="bg-red-100 text-red-800">Due Today</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge className="bg-orange-100 text-orange-800">Due in {daysUntil}d</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800">Due in {daysUntil}d</Badge>;
    }

    return null;
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subscriptions</SelectItem>
              <SelectItem value="mine">My Subscriptions</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="others">Assigned to Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedSubscriptions.length} of {subscriptions.length} subscriptions
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchaseDate">Purchase Date</SelectItem>
              <SelectItem value="serviceName">Service Name</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="billingCycle">Billing Cycle</SelectItem>
              <SelectItem value="assignedUser">Assigned To</SelectItem>
              <SelectItem value="renewalDate">Renewal Date</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm"
          >
            {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>

      {/* Table */}
      {filteredAndSortedSubscriptions.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('serviceName')}
                >
                  Service Name {sortBy === 'serviceName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('category')}
                >
                  Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('billingCycle')}
                >
                  Billing {sortBy === 'billingCycle' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('status')}
                >
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('assignedUser')}
                >
                  Assigned To {sortBy === 'assignedUser' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('renewalDate')}
                >
                  Next Renewal {sortBy === 'renewalDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSubscriptions.map((subscription) => (
                <TableRow key={subscription.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{subscription.serviceName}</span>
                      {subscription.vendor && (
                        <span className="text-xs text-gray-500">{subscription.vendor}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{subscription.category || '-'}</TableCell>
                  <TableCell>{formatBillingCycle(subscription.billingCycle)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(subscription.status)}
                      {getRenewalBadge(subscription)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {subscription.assignedUser ? (
                        <span className="font-medium text-gray-700">
                          {subscription.assignedUser.name || subscription.assignedUser.email}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                      {subscription.assignedUserId === currentUserId && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          You
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {subscription.renewalDate && subscription.status !== 'CANCELLED' && subscription.status !== 'PAUSED' ? (
                      formatDate(getNextRenewalDate(subscription.renewalDate, subscription.billingCycle))
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/employee/subscriptions/${subscription.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-lg font-medium">No subscriptions found</p>
          <p className="text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
