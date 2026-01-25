/**
 * @file SpendRequestListTableFiltered.tsx
 * @description Table component with client-side filtering for spend requests
 * @module features/spend-requests/components
 *
 * Features:
 * - Instant client-side filtering (no loading spinner)
 * - Search across reference number, title, requester
 * - Status and Priority filters
 * - Client-side pagination (50 per page)
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TableFilterBar } from '@/components/ui/table-filter-bar';
import { useClientDataTable } from '@/hooks/use-client-data-table';
import { Eye, ShoppingCart } from 'lucide-react';
import { StatusBadge, PriorityBadge } from './StatusBadge';

const PAGE_SIZE = 50;

export interface SpendRequestItem {
  id: string;
  referenceNumber: string;
  requestDate: string;
  status: string;
  priority: string;
  title: string;
  totalAmount: string;
  currency: string;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count: {
    items: number;
  };
}

type SpendRequestFilters = {
  status: string;
  priority: string;
  [key: string]: string;
};

interface SpendRequestListTableFilteredProps {
  requests: SpendRequestItem[];
  isAdmin?: boolean;
}

export function SpendRequestListTableFiltered({
  requests,
  isAdmin = false
}: SpendRequestListTableFilteredProps) {
  const [page, setPage] = useState(1);

  // Client-side filtering using hook
  const {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    resetFilters,
  } = useClientDataTable<SpendRequestItem, SpendRequestFilters>({
    data: requests,
    searchFields: ['referenceNumber', 'title'],
    defaultSort: 'referenceNumber',
    defaultOrder: 'desc',
    initialFilters: { status: 'PENDING', priority: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;
      if (key === 'status') return item.status === value;
      if (key === 'priority') return item.priority === value;
      return true;
    },
  });

  // Additional search for nested fields
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return filteredData;
    const term = searchTerm.toLowerCase();
    return filteredData.filter(request =>
      request.referenceNumber.toLowerCase().includes(term) ||
      request.title.toLowerCase().includes(term) ||
      request.requester.name?.toLowerCase().includes(term) ||
      request.requester.email.toLowerCase().includes(term)
    );
  }, [filteredData, searchTerm]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return searchFilteredData.slice(start, start + PAGE_SIZE);
  }, [searchFilteredData, page]);

  const totalPages = Math.ceil(searchFilteredData.length / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = <K extends keyof SpendRequestFilters>(key: K, value: SpendRequestFilters[K]) => {
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

  const hasActiveFilters = searchTerm !== '' || filters.status !== 'PENDING' || filters.priority !== 'all';

  // Format amount with currency
  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-QA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' ' + currency;
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const basePath = isAdmin ? '/admin/spend-requests' : '/employee/spend-requests';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by reference, title..."
        resultCount={searchFilteredData.length}
        totalCount={requests.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => handleFilterChange('priority', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </TableFilterBar>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Title</TableHead>
              {isAdmin && <TableHead>Requested By</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-8">
                  <ShoppingCart className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No spend requests match your filters'
                      : 'No spend requests found'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((request) => (
                <TableRow
                  key={request.id}
                  className={
                    request.status === 'PENDING' ? 'bg-yellow-50 hover:bg-yellow-100' :
                    request.priority === 'URGENT' ? 'bg-red-50 hover:bg-red-100' :
                    ''
                  }
                >
                  <TableCell className="font-mono text-sm">
                    <Link
                      href={`${basePath}/${request.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {request.referenceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {request.title}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{request.requester.name || request.requester.email}</div>
                        {request.requester.name && (
                          <div className="text-gray-500 text-xs">{request.requester.email}</div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(request.requestDate)}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={request.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatAmount(request.totalAmount, request.currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Link href={`${basePath}/${request.id}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
