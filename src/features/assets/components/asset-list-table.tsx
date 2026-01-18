/**
 * @file asset-list-table.tsx
 * @description Table component with client-side filtering for assets
 * @module components/domains/operations/assets
 *
 * Features:
 * - Instant client-side filtering (no loading spinner)
 * - Search across asset tag, model, brand, type, serial
 * - Status, Type, and Category filters
 * - Sortable columns
 * - Client-side pagination (50 per page)
 *
 * Usage:
 * - Used on admin assets list page (/admin/assets)
 * - Receives assets as prop (fetched in parent)
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
import { AssetActions } from './asset-actions';
import { AssetStatusBadge, type AdminAsset } from './asset-shared';
import { Users, MapPin, Clock, Package } from 'lucide-react';

const PAGE_SIZE = 50;

type Asset = AdminAsset;

type AssetFilters = {
  status: string;
  type: string;
  categoryId: string;
  [key: string]: string;
};

interface AssetListTableProps {
  assets: Asset[];
}

export function AssetListTable({ assets }: AssetListTableProps) {
  const [page, setPage] = useState(1);

  // Get unique values for filter dropdowns
  const uniqueTypes = useMemo(() => {
    const types = new Map<string, number>();
    assets.forEach(a => {
      if (a.type) {
        types.set(a.type, (types.get(a.type) || 0) + 1);
      }
    });
    return Array.from(types.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .map(([type, count]) => ({ type, count }));
  }, [assets]);

  const uniqueCategories = useMemo(() => {
    const categories = new Map<string, { id: string; name: string; count: number }>();
    assets.forEach(a => {
      if (a.assetCategory) {
        const existing = categories.get(a.assetCategory.id);
        if (existing) {
          existing.count++;
        } else {
          categories.set(a.assetCategory.id, {
            id: a.assetCategory.id,
            name: a.assetCategory.name,
            count: 1,
          });
        }
      }
    });
    return Array.from(categories.values()).sort((a, b) => b.count - a.count);
  }, [assets]);

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
  } = useClientDataTable<Asset, AssetFilters>({
    data: assets,
    searchFields: ['assetTag', 'model', 'brand', 'type', 'serial'],
    defaultSort: 'assetTag',
    defaultOrder: 'asc',
    initialFilters: { status: 'active', type: 'all', categoryId: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;

      if (key === 'status') {
        if (value === 'active') {
          return item.status !== 'DISPOSED';
        }
        return item.status === value;
      }

      if (key === 'type') {
        return item.type === value;
      }

      if (key === 'categoryId') {
        return item.assetCategory?.id === value;
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
  const handleFilterChange = <K extends keyof AssetFilters>(key: K, value: AssetFilters[K]) => {
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

  const hasActiveFilters = searchTerm !== '' || filters.status !== 'active' || filters.type !== 'all' || filters.categoryId !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search assets..."
        resultCount={filteredData.length}
        totalCount={assets.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-[140px]">
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

        <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueTypes.map((opt) => (
              <SelectItem key={opt.type} value={opt.type}>
                {opt.type} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.categoryId} onValueChange={(v) => handleFilterChange('categoryId', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name} ({opt.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableFilterBar>

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
                onClick={() => toggleSort('priceQAR')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'priceQAR' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('priceQAR')}
              >
                Price (QAR) {sortBy === 'priceQAR' && (sortOrder === 'asc' ? '↑' : '↓')}
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
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No assets match your filters'
                      : 'No assets found. Create your first asset!'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      href={`/admin/assets/${asset.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {asset.assetTag || <span className="text-gray-400 italic">N/A</span>}
                    </Link>
                  </TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{asset.model}</TableCell>
                  <TableCell>{asset.brand || '-'}</TableCell>
                  <TableCell>
                    {asset.priceQAR ? (
                      <span className="font-medium">
                        {Number(asset.priceQAR).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell><AssetStatusBadge status={asset.status} /></TableCell>
                  <TableCell className="text-sm">
                    {asset.isShared ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Users className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                        {asset.location && (
                          <span className="text-gray-500 text-xs flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {asset.location.name}
                          </span>
                        )}
                      </div>
                    ) : asset.assignedMember ? (
                      <Link
                        href={`/admin/users/${asset.assignedMember.id}`}
                        className="text-gray-900 hover:text-gray-700 cursor-pointer font-medium"
                      >
                        {asset.assignedMember.name || asset.assignedMember.email}
                      </Link>
                    ) : asset.assetRequests && asset.assetRequests.length > 0 ? (
                      <Link
                        href={`/admin/asset-requests/${asset.assetRequests[0].id}`}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                        <span className="text-xs text-amber-600 truncate max-w-[100px]">
                          {asset.assetRequests[0].member?.name || asset.assetRequests[0].member?.email}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AssetActions assetId={asset.id} />
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
