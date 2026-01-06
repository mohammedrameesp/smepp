/**
 * @file employee-asset-list-table.tsx
 * @description Table component for employee asset view with assignment filtering
 * @module components/domains/operations/assets
 *
 * Features:
 * - Client-side filtering and sorting (data passed from server component)
 * - Search by model, brand, type, asset tag, or assignee
 * - Filter by status (In Use, Spare, Repair, Disposed)
 * - Filter by asset type
 * - Filter by assignment (All, My Assets, Unassigned, Others)
 * - Sortable columns (Model, Brand, Type, Status, Assigned To, Purchase Date)
 * - Highlights "You" badge on assets assigned to current user
 * - Status badge with color variants
 *
 * Props:
 * - assets: Array of assets to display
 * - currentUserId: ID of the current logged-in user (for "My Assets" filter)
 *
 * Assignment Filter Options:
 * - all: Show all assets
 * - mine: Only assets assigned to current user
 * - unassigned: Assets with no assignee
 * - others: Assets assigned to other team members
 *
 * Status Badge Variants:
 * - IN_USE: default (primary)
 * - SPARE: secondary
 * - REPAIR: destructive
 * - DISPOSED: outline
 *
 * Usage:
 * - Used on employee assets page (/employee/assets)
 * - Allows employees to view organization's visible assets
 * - Links to employee asset detail view
 *
 * Access: Employee
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/date-format';

interface Asset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  category: string | null;
  type: string;
  status: string;
  price: number | null;
  priceQAR: number | null;
  warrantyExpiry: Date | null;
  purchaseDate: Date | null;
  assignedMemberId: string | null;
  assignedMember: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface EmployeeAssetListTableProps {
  assets: Asset[];
  currentUserId: string;
}

export function EmployeeAssetListTable({ assets, currentUserId }: EmployeeAssetListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
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

    // Apply assignment filter
    if (assignmentFilter === 'mine') {
      filtered = filtered.filter(asset => asset.assignedMemberId === currentUserId);
    } else if (assignmentFilter === 'unassigned') {
      filtered = filtered.filter(asset => !asset.assignedMemberId);
    } else if (assignmentFilter === 'others') {
      filtered = filtered.filter(asset => asset.assignedMemberId && asset.assignedMemberId !== currentUserId);
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
        case 'assignedMember':
          aValue = a.assignedMember?.name || a.assignedMember?.email || 'zzz';
          bValue = b.assignedMember?.name || b.assignedMember?.email || 'zzz';
          break;
        case 'purchaseDate':
          aValue = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
          bValue = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [assets, searchTerm, statusFilter, typeFilter, assignmentFilter, sortBy, sortOrder, currentUserId]);

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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="mine">My Assets</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectItem value="others">Assigned to Others</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sort Options */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedAssets.length} of {assets.length} assets
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Added</SelectItem>
              <SelectItem value="model">Model</SelectItem>
              <SelectItem value="brand">Brand</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="assignedMember">Assigned To</SelectItem>
              <SelectItem value="purchaseDate">Purchase Date</SelectItem>
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
      {filteredAndSortedAssets.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
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
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('assignedMember')}
                >
                  Assigned To {sortBy === 'assignedMember' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('purchaseDate')}
                >
                  Purchase Date {sortBy === 'purchaseDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedAssets.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{asset.model}</span>
                      {asset.assetTag && (
                        <span className="text-xs text-gray-500 font-mono">{asset.assetTag}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{asset.brand || '-'}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(asset.status)}>
                      {asset.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {asset.assignedMember ? (
                        <span className="font-medium text-gray-700">
                          {asset.assignedMember.name || asset.assignedMember.email}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                      {asset.assignedMemberId === currentUserId && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          You
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {asset.purchaseDate ? formatDate(asset.purchaseDate) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/employee/assets/${asset.id}`}>
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
          <p className="text-lg font-medium">No assets found</p>
          <p className="text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
