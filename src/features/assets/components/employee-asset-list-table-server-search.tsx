/**
 * @file employee-asset-list-table-server-search.tsx
 * @description Employee-focused table component with server-side search, filtering, and pagination
 * @module components/domains/operations/assets
 *
 * Features:
 * - Server-side pagination (50 items per page)
 * - Debounced search (300ms) across asset tag, model, brand, type
 * - Dynamic filter options fetched from API (types with counts)
 * - Status filter: Active (excludes Disposed), All, or specific status
 * - **Assignment filter**: All (default), My Assets, Unassigned, Assigned to Others (employee-specific)
 * - Type dropdown populated from tenant's actual data
 * - Sortable columns with ARIA attributes for accessibility
 * - Shows "You" badge on user's assigned assets
 * - Hides sensitive fields (price, serial, supplier)
 * - Loading states with spinner
 *
 * Filters:
 * - Search: Full-text search across multiple fields
 * - Status: active (default), all, IN_USE, SPARE, REPAIR, DISPOSED
 * - Type: Dynamic from /api/assets/filters
 * - Assignment: All (default), My Assets, Unassigned, Others
 *
 * Sortable Columns:
 * - Asset Tag, Type, Model, Brand, Status, Purchase Date
 * - Keyboard accessible (Enter key triggers sort)
 *
 * API Dependencies:
 * - GET /api/assets?p={page}&ps={pageSize}&sort={col}&order={dir}&q={search}&status={status}&type={type}&assignmentFilter={filter}
 * - GET /api/assets/filters - Fetches available types with counts
 *
 * Usage:
 * - Used on employee assets list page (/employee/assets)
 * - Primary table for browsing company assets
 *
 * Access: All authenticated employees
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AssetStatusBadge, type EmployeeAssetServer } from './asset-shared';
import { Loader2 } from 'lucide-react';

// Using EmployeeAssetServer from asset-shared.tsx (excludes sensitive fields)
type Asset = EmployeeAssetServer;

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface TypeOption {
  type: string;
  count: number;
}

interface EmployeeAssetListTableServerSearchProps {
  currentUserId: string;
}

export function EmployeeAssetListTableServerSearch({ currentUserId }: EmployeeAssetListTableServerSearchProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all'); // Default to "All Assets"
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Dynamic filter options
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [, setFilterError] = useState(false);

  // Fetch filter options on mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('/api/assets/filters');
        if (response.ok) {
          const data = await response.json();
          setTypeOptions(data.types || []);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setFilterError(true);
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

  // Fetch assets from API
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        p: pagination.page.toString(),
        ps: pagination.pageSize.toString(),
        sort: sortBy,
        order: sortOrder,
      });

      if (debouncedSearch) params.append('q', debouncedSearch);
      if (statusFilter === 'active') {
        params.append('excludeStatus', 'DISPOSED');
      } else if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);

      // Assignment filter (employee-specific)
      if (assignmentFilter === 'mine') {
        params.append('assignedMemberId', currentUserId);
      } else if (assignmentFilter !== 'all') {
        params.append('assignmentFilter', assignmentFilter);
      }

      const response = await fetch(`/api/assets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch assets');

      const data = await response.json();
      setAssets(data.assets);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, statusFilter, typeFilter, assignmentFilter, sortBy, sortOrder, currentUserId]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

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
            placeholder="Search assets..."
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
            <SelectValue placeholder="Active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All (incl. Disposed)</SelectItem>
            <SelectItem value="IN_USE">In Use</SelectItem>
            <SelectItem value="SPARE">Spare</SelectItem>
            <SelectItem value="REPAIR">Repair</SelectItem>
            <SelectItem value="DISPOSED">Disposed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOptions.map((opt) => (
              <SelectItem key={opt.type} value={opt.type}>
                {opt.type} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Assignment filter (employee-specific) */}
        <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Assets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="mine">My Assets</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            <SelectItem value="others">Assigned to Others</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing {assets.length > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} assets
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('assetTag')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'assetTag' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('assetTag')}
              >
                Asset Tag {sortBy === 'assetTag' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('type')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'type' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('type')}
              >
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('model')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'model' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('model')}
              >
                Model {sortBy === 'model' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('brand')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'brand' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('brand')}
              >
                Brand {sortBy === 'brand' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('status')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('status')}
              >
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Configuration</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading assets...</p>
                </TableCell>
              </TableRow>
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {assignmentFilter === 'mine' && !debouncedSearch && statusFilter === 'active' && typeFilter === 'all'
                    ? 'No assets assigned to you yet'
                    : (debouncedSearch || (statusFilter !== 'all' && statusFilter !== 'active') || typeFilter !== 'all' || assignmentFilter !== 'all')
                    ? 'No assets match your filters'
                    : 'No assets found'}
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      href={`/employee/assets/${asset.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {asset.assetTag || <span className="text-gray-400 italic">N/A</span>}
                    </Link>
                  </TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{asset.model}</TableCell>
                  <TableCell>{asset.brand || '-'}</TableCell>
                  <TableCell><AssetStatusBadge status={asset.status} /></TableCell>
                  <TableCell className="text-sm">
                    {asset.assignedMember ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">
                          {asset.assignedMember.name || asset.assignedMember.email}
                        </span>
                        {asset.assignedMember.id === currentUserId && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            You
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px]">
                    {asset.configuration ? (
                      <span className="truncate block" title={asset.configuration}>
                        {asset.configuration}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/employee/assets/${asset.id}`}>
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
