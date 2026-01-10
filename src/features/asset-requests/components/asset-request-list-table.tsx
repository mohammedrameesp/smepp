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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/core/datetime';
import { AssetRequestStatusBadge } from './asset-request-status-badge';
import { AssetRequestTypeBadge } from './asset-request-type-badge';
import { ClipboardList } from 'lucide-react';

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

export function AssetRequestListTable({
  requests,
  isAdmin = false,
  showUser = true,
  basePath = '/employee/asset-requests',
}: AssetRequestListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique statuses and types for filters
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.status))).sort();
  }, [requests]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.type))).sort();
  }, [requests]);

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = requests;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(request =>
        request.requestNumber.toLowerCase().includes(term) ||
        request.asset.model.toLowerCase().includes(term) ||
        request.asset.brand?.toLowerCase().includes(term) ||
        request.asset.assetTag?.toLowerCase().includes(term) ||
        request.member.name?.toLowerCase().includes(term) ||
        request.member.email.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.type === typeFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'requestNumber':
          aValue = a.requestNumber;
          bValue = b.requestNumber;
          break;
        case 'asset':
          aValue = a.asset.model.toLowerCase();
          bValue = b.asset.model.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [requests, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Input
            placeholder="Search requests..."
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
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </SelectItem>
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
                  {status.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date</SelectItem>
              <SelectItem value="requestNumber">Request #</SelectItem>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border rounded-md hover:bg-gray-50 text-sm"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600" aria-live="polite" aria-atomic="true">
        Showing {filteredAndSortedRequests.length} of {requests.length} requests
      </div>

      {/* Table */}
      {filteredAndSortedRequests.length > 0 ? (
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
                  aria-label="Sort by request number"
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
                  aria-label="Sort by type"
                >
                  Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('asset')}
                  onKeyDown={(e) => e.key === 'Enter' && toggleSort('asset')}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === 'asset' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  aria-label="Sort by asset"
                >
                  Asset {sortBy === 'asset' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                {showUser && <TableHead>User</TableHead>}
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('status')}
                  onKeyDown={(e) => e.key === 'Enter' && toggleSort('status')}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === 'status' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  aria-label="Sort by status"
                >
                  Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('createdAt')}
                  onKeyDown={(e) => e.key === 'Enter' && toggleSort('createdAt')}
                  role="button"
                  tabIndex={0}
                  aria-sort={sortBy === 'createdAt' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  aria-label="Sort by date"
                >
                  Date {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRequests.map((request) => (
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
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-lg font-medium">No requests found</p>
          <p className="text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
