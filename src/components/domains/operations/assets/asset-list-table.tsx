/**
 * @file asset-list-table.tsx
 * @description Table component displaying assets with client-side filtering and sorting
 * @module components/domains/operations/assets
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssetActions } from './asset-actions';

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
  warrantyExpiry: Date | null;
  serial: string | null;
  supplier: string | null;
  configuration: string | null;
  assignedMember: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface AssetListTableProps {
  assets: Asset[];
}

export function AssetListTable({ assets }: AssetListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique types and statuses for filters
  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.type))).sort();
  }, [assets]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(assets.map(a => a.status))).sort();
  }, [assets]);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.model.toLowerCase().includes(term) ||
        asset.brand?.toLowerCase().includes(term) ||
        asset.type.toLowerCase().includes(term) ||
        asset.assetTag?.toLowerCase().includes(term) ||
        asset.serial?.toLowerCase().includes(term) ||
        asset.supplier?.toLowerCase().includes(term) ||
        asset.configuration?.toLowerCase().includes(term) ||
        asset.assignedMember?.name?.toLowerCase().includes(term) ||
        asset.assignedMember?.email?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(asset => asset.type === typeFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'model':
          aValue = a.model.toLowerCase();
          bValue = b.model.toLowerCase();
          break;
        case 'brand':
          aValue = (a.brand || '').toLowerCase();
          bValue = (b.brand || '').toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'price':
          aValue = a.price ? parseFloat(a.price) : 0;
          bValue = b.price ? parseFloat(b.price) : 0;
          break;
        case 'assignedMember':
          aValue = a.assignedMember?.name || a.assignedMember?.email || 'zzz';
          bValue = b.assignedMember?.name || b.assignedMember?.email || 'zzz';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [assets, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'IN_USE':
        return 'default';
      case 'SPARE':
        return 'secondary';
      case 'REPAIR':
        return 'destructive';
      case 'DISPOSED':
        return 'outline';
      default:
        return 'secondary';
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
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {uniqueTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
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
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
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
              <SelectItem value="createdAt">Date Added</SelectItem>
              <SelectItem value="model">Model</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="assignedMember">Assigned To</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredAndSortedAssets.length} of {assets.length} assets
      </div>

      {/* Table */}
      {filteredAndSortedAssets.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
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
                className="cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                onClick={() => toggleSort('brand')}
              >
                Brand {sortBy === 'brand' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('model')}
              >
                Model {sortBy === 'model' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 hidden md:table-cell"
                onClick={() => toggleSort('type')}
              >
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('status')}
              >
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                onClick={() => toggleSort('assignedMember')}
              >
                Assigned To {sortBy === 'assignedMember' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-gray-100 hidden xl:table-cell"
                onClick={() => toggleSort('price')}
              >
                Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedAssets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-mono text-sm">
                  {asset.assetTag || 'N/A'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">{asset.brand || '-'}</TableCell>
                <TableCell className="font-medium">{asset.model}</TableCell>
                <TableCell className="hidden md:table-cell">{asset.type}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(asset.status)}>
                    {asset.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {asset.assignedMember ? (
                    <Link
                      href={`/admin/users/${asset.assignedMember.id}`}
                      className="font-semibold text-gray-700 hover:text-gray-900 hover:underline"
                    >
                      {asset.assignedMember.name || asset.assignedMember.email || 'Unknown User'}
                    </Link>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-right hidden xl:table-cell">
                  {asset.price ? `${asset.priceCurrency === 'USD' ? '$' : 'QAR'} ${parseFloat(asset.price).toFixed(2)}` : 'N/A'}
                </TableCell>
                <TableCell>
                  <AssetActions assetId={asset.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No assets found matching your filters
        </div>
      )}
    </div>
  );
}
