'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Supplier {
  id: string;
  suppCode: string | null;
  name: string;
  category: string;
  city: string | null;
  country: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactMobile: string | null;
  _count: {
    engagements: number;
  };
}

interface EmployeeSupplierListTableProps {
  suppliers: Supplier[];
}

export function EmployeeSupplierListTable({ suppliers }: EmployeeSupplierListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique categories for filters
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(suppliers.map(s => s.category).filter(Boolean))).sort() as string[];
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
        supplier.category?.toLowerCase().includes(term) ||
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
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'suppCode':
          aValue = a.suppCode?.toLowerCase() || '';
          bValue = b.suppCode?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || 'zzz';
          bValue = b.category?.toLowerCase() || 'zzz';
          break;
        case 'location':
          aValue = `${a.city || ''} ${a.country || ''}`.toLowerCase();
          bValue = `${b.city || ''} ${b.country || ''}`.toLowerCase();
          break;
        case 'engagements':
          aValue = a._count.engagements;
          bValue = b._count.engagements;
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
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Sort Options */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredAndSortedSuppliers.length} of {suppliers.length} suppliers
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="suppCode">Supplier Code</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="engagements">Engagements</SelectItem>
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
      {filteredAndSortedSuppliers.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('name')}
                >
                  Supplier Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('suppCode')}
                >
                  Code {sortBy === 'suppCode' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('category')}
                >
                  Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('location')}
                >
                  Location {sortBy === 'location' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort('engagements')}
                >
                  Engagements {sortBy === 'engagements' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedSuppliers.map((supplier) => (
                <TableRow key={supplier.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {supplier.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
                      {supplier.suppCode}
                    </Badge>
                  </TableCell>
                  <TableCell>{supplier.category}</TableCell>
                  <TableCell>
                    {[supplier.city, supplier.country].filter(Boolean).join(', ') || '-'}
                  </TableCell>
                  <TableCell>
                    {supplier.primaryContactName ? (
                      <div className="flex flex-col text-sm">
                        <span className="font-medium text-gray-700">{supplier.primaryContactName}</span>
                        {supplier.primaryContactEmail && (
                          <span className="text-xs text-gray-500">{supplier.primaryContactEmail}</span>
                        )}
                        {supplier.primaryContactMobile && (
                          <span className="text-xs text-gray-500">{supplier.primaryContactMobile}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-gray-100">
                      {supplier._count.engagements}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/employee/suppliers/${supplier.id}`}>
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
          <p className="text-lg font-medium">No suppliers found</p>
          <p className="text-sm">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}
