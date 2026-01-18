/**
 * @file asset-request-list-table.tsx
 * @description Table component displaying asset requests with filtering, sorting, and pagination
 * @module components/domains/operations/asset-requests
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableFilterBar } from '@/components/ui/table-filter-bar';
import { useClientDataTable } from '@/hooks/use-client-data-table';
import { AssetRequestStatusBadge } from './asset-request-status-badge';
import { AssetRequestTypeBadge } from './asset-request-type-badge';
import { ClipboardList } from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';

interface Asset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  type: string;
}

interface Member {
  id: string;
  name: string | null;
  email: string;
}

export interface AssetRequest {
  id: string;
  requestNumber: string;
  type: string;
  status: string;
  reason: string | null;
  notes: string | null;
  createdAt: Date | string;
  asset: Asset;
  member: Member;
  assignedByMember?: Member | null;
}

interface AssetRequestListTableProps {
  requests: AssetRequest[];
  isAdmin?: boolean;
  showUser?: boolean;
  basePath?: string;
}

type AssetRequestFilters = {
  status: string;
  type: string;
  [key: string]: string;
};

const PAGE_SIZE = 50;

export function AssetRequestListTable({
  requests,
  showUser = true,
  basePath = '/employee/asset-requests',
}: AssetRequestListTableProps) {
  const [page, setPage] = useState(1);

  // Get unique statuses and types for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = new Map<string, number>();
    requests.forEach(r => {
      statuses.set(r.status, (statuses.get(r.status) || 0) + 1);
    });
    return Array.from(statuses.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }));
  }, [requests]);

  const uniqueTypes = useMemo(() => {
    const types = new Map<string, number>();
    requests.forEach(r => {
      types.set(r.type, (types.get(r.type) || 0) + 1);
    });
    return Array.from(types.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  }, [requests]);

  // Client-side filtering using hook
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
  } = useClientDataTable<AssetRequest, AssetRequestFilters>({
    data: requests,
    searchFields: ['requestNumber'],
    defaultSort: 'requestNumber',
    defaultOrder: 'desc',
    initialFilters: { status: 'PENDING', type: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;
      if (key === 'status') return item.status === value;
      if (key === 'type') return item.type === value;
      return true;
    },
  });

  // Additional search for nested fields
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return filteredData;
    const term = searchTerm.toLowerCase();
    return filteredData.filter(request =>
      request.requestNumber.toLowerCase().includes(term) ||
      request.asset.model.toLowerCase().includes(term) ||
      request.asset.brand?.toLowerCase().includes(term) ||
      request.asset.assetTag?.toLowerCase().includes(term) ||
      request.member.name?.toLowerCase().includes(term) ||
      request.member.email.toLowerCase().includes(term)
    );
  }, [filteredData, searchTerm]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return searchFilteredData.slice(start, start + PAGE_SIZE);
  }, [searchFilteredData, page]);

  const totalPages = Math.ceil(searchFilteredData.length / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = <K extends keyof AssetRequestFilters>(key: K, value: AssetRequestFilters[K]) => {
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

  const hasActiveFilters = searchTerm !== '' || filters.status !== 'PENDING' || filters.type !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search requests..."
        resultCount={searchFilteredData.length}
        totalCount={requests.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map(opt => (
              <SelectItem key={opt.type} value={opt.type}>
                {opt.type.replace(/_/g, ' ')} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map(opt => (
              <SelectItem key={opt.status} value={opt.status}>
                {opt.status.replace(/_/g, ' ')} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableFilterBar>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('requestNumber')}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('requestNumber')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'requestNumber' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Request # {sortBy === 'requestNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('type')}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('type')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'type' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Asset</TableHead>
              {showUser && <TableHead>User</TableHead>}
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('status')}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('status')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showUser ? 7 : 6} className="text-center py-8">
                  <ClipboardList className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No requests match your filters'
                      : 'No requests found'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((request) => (
                <TableRow key={request.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm">
                    {request.requestNumber}
                  </TableCell>
                  <TableCell>
                    <AssetRequestTypeBadge type={request.type} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{request.asset.model}</span>
                      {request.asset.assetTag && (
                        <span className="text-xs text-gray-500 font-mono">{request.asset.assetTag}</span>
                      )}
                    </div>
                  </TableCell>
                  {showUser && (
                    <TableCell>
                      <span className="text-sm">
                        {request.member.name || request.member.email}
                      </span>
                    </TableCell>
                  )}
                  <TableCell>
                    <AssetRequestStatusBadge status={request.status} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`${basePath}/${request.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
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
