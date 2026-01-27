/**
 * @file supplier-list-table.tsx
 * @description Table component displaying suppliers with client-side filtering and sorting
 * @module components/domains/operations/suppliers
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

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

interface SupplierListTableProps {
  suppliers: Supplier[];
}

export function SupplierListTable({ suppliers }: SupplierListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get unique categories for filters
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(suppliers.map(s => s.category))).sort();
  }, [suppliers]);

  // Filter and sort suppliers
  const filteredAndSortedSuppliers = useMemo(() => {
    let filtered = suppliers;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(term) ||
        supplier.suppCode?.toLowerCase().includes(term) ||
        supplier.category.toLowerCase().includes(term) ||
        supplier.city?.toLowerCase().includes(term) ||
        supplier.country?.toLowerCase().includes(term) ||
        supplier.primaryContactName?.toLowerCase().includes(term) ||
        supplier.primaryContactEmail?.toLowerCase().includes(term)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(supplier => supplier.category === categoryFilter);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'suppCode':
          aValue = (a.suppCode || 'zzz').toLowerCase();
          bValue = (b.suppCode || 'zzz').toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [suppliers, searchTerm, categoryFilter, sortBy, sortOrder]);

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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Input
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
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
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="suppCode">Supplier Code</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredAndSortedSuppliers.length} of {suppliers.length} suppliers
      </div>

      {/* Table */}
      {filteredAndSortedSuppliers.length > 0 ? (
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
              <TableHead>Contact</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedSuppliers.map((supplier) => (
              <TableRow
                key={supplier.id}
                className={
                  supplier.status === 'PENDING' ? 'bg-amber-50/50 hover:bg-amber-100/50' :
                  supplier.status === 'REJECTED' ? 'bg-red-50/50 hover:bg-red-100/50' : ''
                }
              >
                <TableCell className="font-mono text-sm">
                  {supplier.suppCode || <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/suppliers/${supplier.id}`}
                      className="text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {supplier.name}
                    </Link>
                    {supplier.status === 'PENDING' && (
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        Awaiting Approval
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{supplier.category}</TableCell>
                <TableCell>
                  {supplier.primaryContactName ? (
                    <div className="text-sm">
                      <div className="font-medium">{supplier.primaryContactName}</div>
                      <div className="text-gray-500 text-xs">{supplier.primaryContactEmail}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </TableCell>
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8">
          <Building2 className={`${ICON_SIZES['2xl']} mx-auto text-gray-300 mb-2`} />
          <p className="text-gray-500">No suppliers found matching your filters</p>
        </div>
      )}
    </div>
  );
}
