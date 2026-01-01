/**
 * @file asset-list-table-server-search.tsx
 * @description Table component with server-side search, filtering, and pagination for assets
 * @module components/domains/operations/assets
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AssetActions } from './asset-actions';
import { Loader2, Users, MapPin } from 'lucide-react';

interface Asset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  category: string | null;
  type: string;
  status: string;
  price: string | null;
  priceCurrency: string | null;
  priceQAR: number | null;
  warrantyExpiry: Date | null;
  serial: string | null;
  supplier: string | null;
  configuration: string | null;
  isShared: boolean;
  location: string | null;
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

export function AssetListTableServerSearch() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);

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
  }, [pagination.page, pagination.pageSize, debouncedSearch, statusFilter, typeFilter, categoryFilter, sortBy, sortOrder]);

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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      IN_USE: { label: 'In Use', className: 'bg-green-100 text-green-800 border-green-300' },
      SPARE: { label: 'Spare', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      REPAIR: { label: 'Repair', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      DISPOSED: { label: 'Disposed', className: 'bg-gray-100 text-gray-800 border-gray-300' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.className} variant="outline">{config.label}</Badge>;
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
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
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
            <SelectItem value="Laptop">Laptop</SelectItem>
            <SelectItem value="Desktop">Desktop</SelectItem>
            <SelectItem value="Monitor">Monitor</SelectItem>
            <SelectItem value="Keyboard">Keyboard</SelectItem>
            <SelectItem value="Mouse">Mouse</SelectItem>
            <SelectItem value="Headset">Headset</SelectItem>
            <SelectItem value="Phone">Phone</SelectItem>
            <SelectItem value="Tablet">Tablet</SelectItem>
            <SelectItem value="Printer">Printer</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="IT">IT</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Engineering">Engineering</SelectItem>
            <SelectItem value="Sales">Sales</SelectItem>
            <SelectItem value="HR">HR</SelectItem>
            <SelectItem value="Finance">Finance</SelectItem>
            <SelectItem value="Operations">Operations</SelectItem>
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
              >
                Asset Tag {sortBy === 'assetTag' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('type')}
              >
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('model')}
              >
                Model {sortBy === 'model' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('brand')}
              >
                Brand {sortBy === 'brand' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('priceQAR')}
              >
                Price (QAR) {sortBy === 'priceQAR' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('status')}
              >
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Assigned To</TableHead>
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
                  {debouncedSearch || statusFilter !== 'all' || typeFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No assets match your filters'
                    : 'No assets found. Create your first asset!'}
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
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
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
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
                            {asset.location}
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
