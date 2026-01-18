/**
 * @file supplier-list-table-filtered.tsx
 * @description Table component with client-side filtering for suppliers
 * @module features/suppliers/components
 *
 * Features:
 * - Instant client-side filtering (no loading spinner)
 * - Search across name, supplier code, category, contact, location
 * - Status and Category filters
 * - Sortable columns
 * - Client-side pagination (50 per page)
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
import { Building2 } from 'lucide-react';

const PAGE_SIZE = 50;

export interface SupplierListItem {
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

type SupplierFilters = {
  status: string;
  category: string;
  [key: string]: string;
};

interface SupplierListTableFilteredProps {
  suppliers: SupplierListItem[];
}

export function SupplierListTableFiltered({ suppliers }: SupplierListTableFilteredProps) {
  const [page, setPage] = useState(1);

  // Get unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const categories = new Map<string, number>();
    suppliers.forEach(s => {
      if (s.category) {
        categories.set(s.category, (categories.get(s.category) || 0) + 1);
      }
    });
    return Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
  }, [suppliers]);

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
  } = useClientDataTable<SupplierListItem, SupplierFilters>({
    data: suppliers,
    searchFields: ['name', 'suppCode', 'category', 'primaryContactName', 'primaryContactEmail', 'city', 'country'],
    defaultSort: 'name',
    defaultOrder: 'asc',
    initialFilters: { status: 'all', category: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;

      if (key === 'status') {
        return item.status === value;
      }

      if (key === 'category') {
        return item.category === value;
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
  const handleFilterChange = <K extends keyof SupplierFilters>(key: K, value: SupplierFilters[K]) => {
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

  const hasActiveFilters = searchTerm !== '' || filters.status !== 'all' || filters.category !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search suppliers..."
        resultCount={filteredData.length}
        totalCount={suppliers.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((opt) => (
              <SelectItem key={opt.category} value={opt.category}>
                {opt.category} ({opt.count})
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
                onClick={() => toggleSort('suppCode')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'suppCode' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('suppCode')}
              >
                Code {sortBy === 'suppCode' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('name')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('name')}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('category')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'category' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('category')}
              >
                Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
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
              <TableHead className="hidden md:table-cell">Contact</TableHead>
              <TableHead className="hidden lg:table-cell">Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No suppliers match your filters'
                      : 'No suppliers found. Register your first supplier!'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((supplier) => (
                <TableRow
                  key={supplier.id}
                  className={supplier.status === 'PENDING' ? 'bg-amber-50/50 hover:bg-amber-100/50' : ''}
                >
                  <TableCell className="font-mono text-sm">
                    {supplier.suppCode || <span className="text-gray-400">-</span>}
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
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/suppliers/${supplier.id}`}>
                          View
                        </Link>
                      </Button>
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
