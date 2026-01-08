/**
 * @file supplier-list-table-server-search.tsx
 * @description Table component with server-side search, filtering, and pagination for suppliers
 * @module components/domains/operations/suppliers
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';

interface Supplier {
  id: string;
  suppCode: string | null;
  name: string;
  category: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  city: string | null;
  country: string | null;
  createdAt: Date;
  rejectionReason: string | null;
  approvedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count: {
    engagements: number;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function SupplierListTableServerSearch() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  // Fetch suppliers from API
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        p: pagination.page.toString(),
        ps: pagination.pageSize.toString(),
        sort: sortBy,
        order: sortOrder,
      });

      if (debouncedSearch) params.append('q', debouncedSearch);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/suppliers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch suppliers');

      const data = await response.json();
      setSuppliers(data.suppliers);
      setCategories(data.categories || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Input
            placeholder="Search suppliers..."
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
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Date Added</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="suppCode">Supplier Code</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <div>
          Showing {suppliers.length > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} suppliers
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
                onClick={() => toggleSort('suppCode')}
              >
                Code {sortBy === 'suppCode' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('name')}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('category')}
              >
                Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('status')}
              >
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading suppliers...</p>
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {debouncedSearch || categoryFilter !== 'all' || statusFilter !== 'all'
                    ? 'No suppliers match your filters'
                    : 'No suppliers found. Register your first supplier!'}
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className={supplier.status === 'PENDING' ? 'bg-yellow-50 hover:bg-yellow-100' : supplier.status === 'REJECTED' ? 'bg-red-50 hover:bg-red-100' : ''}
                >
                  <TableCell className="font-mono text-sm">
                    {supplier.suppCode || <span className="text-gray-400">—</span>}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/suppliers/${supplier.id}`}
                      className="text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>{supplier.category}</TableCell>
                  <TableCell>
                    {supplier.status === 'APPROVED' && (
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        Approved
                      </Badge>
                    )}
                    {supplier.status === 'PENDING' && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        Pending
                      </Badge>
                    )}
                    {supplier.status === 'REJECTED' && (
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                        Rejected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {supplier.primaryContactName ? (
                      <div className="text-sm">
                        <div className="font-medium">{supplier.primaryContactName}</div>
                        <div className="text-gray-500 text-xs">{supplier.primaryContactEmail}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {supplier.city || supplier.country ? (
                      <div className="text-sm text-gray-600">
                        {[supplier.city, supplier.country].filter(Boolean).join(', ')}
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Link href={`/admin/suppliers/${supplier.id}`}>
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
