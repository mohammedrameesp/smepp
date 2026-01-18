/**
 * @file employee-list-table-filtered.tsx
 * @description Table component with client-side filtering for employees
 * @module features/employees/components
 *
 * Features:
 * - Instant client-side filtering (no loading spinner)
 * - Search across name, email, employee ID, designation
 * - Profile status, expiry status, and sponsorship filters
 * - Sortable columns
 * - Client-side pagination (50 per page)
 * - Export functionality
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TableFilterBar } from '@/components/ui/table-filter-bar';
import { useClientDataTable } from '@/hooks/use-client-data-table';
import { Download, User, Package, Clock, CheckCircle2, Circle, ShieldCheck, Briefcase, UserCog, CircleDollarSign, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmployeeActions } from './employee-actions';
import { SPONSORSHIP_TYPES } from '@/lib/data/constants';
import { calculateTenure } from '@/features/employees/lib/hr-utils';

const PAGE_SIZE = 50;

// Role derivation for simplified access control display
type AccessRole = 'Admin' | 'Manager' | 'HR' | 'Finance' | 'Operations' | 'Employee';

function deriveAccessRole(employee: {
  isAdmin?: boolean;
  isManager?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  hasOperationsAccess?: boolean;
}): AccessRole {
  if (employee.isAdmin) return 'Admin';
  if (employee.isManager) return 'Manager';
  if (employee.hasHRAccess) return 'HR';
  if (employee.hasFinanceAccess) return 'Finance';
  if (employee.hasOperationsAccess) return 'Operations';
  return 'Employee';
}

const ROLE_STYLES: Record<AccessRole, { bg: string; text: string; icon: typeof ShieldCheck }> = {
  Admin: { bg: 'bg-red-100', text: 'text-red-700', icon: ShieldCheck },
  Manager: { bg: 'bg-purple-100', text: 'text-purple-700', icon: UserCog },
  HR: { bg: 'bg-green-100', text: 'text-green-700', icon: UserCog },
  Finance: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: CircleDollarSign },
  Operations: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Briefcase },
  Employee: { bg: 'bg-gray-100', text: 'text-gray-600', icon: User },
};

export interface EmployeeListItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  isAdmin?: boolean;
  isManager?: boolean;
  hasOperationsAccess?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  reportingTo?: { id: string; name: string } | null;
  _count: {
    assets: number;
    subscriptions: number;
  };
  hrProfile: {
    employeeId: string | null;
    designation: string | null;
    qidNumber: string | null;
    qidExpiry: string | null;
    passportExpiry: string | null;
    healthCardExpiry: string | null;
    sponsorshipType: string | null;
    photoUrl: string | null;
    dateOfJoining: string | null;
    onboardingComplete: boolean | null;
    onboardingStep: number | null;
  } | null;
  profileStatus: {
    isComplete: boolean;
    completionPercentage: number;
  };
  expiryStatus: {
    qid: 'expired' | 'expiring' | 'valid' | null;
    passport: 'expired' | 'expiring' | 'valid' | null;
    healthCard: 'expired' | 'expiring' | 'valid' | null;
    overall: 'expired' | 'expiring' | 'valid' | null;
  };
}

type EmployeeFilters = {
  profileStatus: string;
  expiryStatus: string;
  sponsorshipType: string;
  [key: string]: string;
};

interface EmployeeListTableFilteredProps {
  employees: EmployeeListItem[];
}

export function EmployeeListTableFiltered({ employees }: EmployeeListTableFilteredProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);

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
  } = useClientDataTable<EmployeeListItem, EmployeeFilters>({
    data: employees,
    searchFields: ['name', 'email'],
    defaultSort: 'name',
    defaultOrder: 'asc',
    initialFilters: { profileStatus: 'all', expiryStatus: 'all', sponsorshipType: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;

      if (key === 'profileStatus') {
        if (value === 'complete') return item.profileStatus?.isComplete === true;
        if (value === 'incomplete') return item.profileStatus?.isComplete !== true;
        return true;
      }

      if (key === 'expiryStatus') {
        if (value === 'expired') return item.expiryStatus?.overall === 'expired';
        if (value === 'expiring') return item.expiryStatus?.overall === 'expiring';
        return true;
      }

      if (key === 'sponsorshipType') {
        return item.hrProfile?.sponsorshipType === value;
      }

      return true;
    },
  });

  // Additional search for employee ID and designation (not direct fields)
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return filteredData;
    const term = searchTerm.toLowerCase();
    return filteredData.filter(emp =>
      emp.name?.toLowerCase().includes(term) ||
      emp.email.toLowerCase().includes(term) ||
      emp.hrProfile?.employeeId?.toLowerCase().includes(term) ||
      emp.hrProfile?.designation?.toLowerCase().includes(term)
    );
  }, [filteredData, searchTerm]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return searchFilteredData.slice(start, start + PAGE_SIZE);
  }, [searchFilteredData, page]);

  const totalPages = Math.ceil(searchFilteredData.length / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = <K extends keyof EmployeeFilters>(key: K, value: EmployeeFilters[K]) => {
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

  const hasActiveFilters = searchTerm !== '' || filters.profileStatus !== 'all' || filters.expiryStatus !== 'all' || filters.sponsorshipType !== 'all';

  const handleExport = async () => {
    try {
      const response = await fetch('/api/employees/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search name, email, ID..."
        resultCount={searchFilteredData.length}
        totalCount={employees.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.profileStatus} onValueChange={(v) => handleFilterChange('profileStatus', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Profiles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.expiryStatus} onValueChange={(v) => handleFilterChange('expiryStatus', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.sponsorshipType} onValueChange={(v) => handleFilterChange('sponsorshipType', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="Sponsorship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sponsorships</SelectItem>
            {SPONSORSHIP_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </TableFilterBar>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleSort('name')}
                role="button"
                tabIndex={0}
                aria-sort={sortBy === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                onKeyDown={(e) => e.key === 'Enter' && toggleSort('name')}
              >
                Employee {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="hidden lg:table-cell">Employee ID</TableHead>
              <TableHead className="hidden xl:table-cell">Designation</TableHead>
              <TableHead className="hidden md:table-cell">Access</TableHead>
              <TableHead className="text-center">Assets</TableHead>
              <TableHead className="text-center hidden xl:table-cell">Tenure</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Onboarding</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Users className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No employees match your filters'
                      : 'No employees found'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((employee) => (
                <TableRow
                  key={employee.id}
                  onClick={() => router.push(`/admin/employees/${employee.id}`)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    employee.expiryStatus?.overall === 'expired'
                      ? 'bg-red-50 hover:bg-red-100'
                      : employee.expiryStatus?.overall === 'expiring'
                      ? 'bg-yellow-50 hover:bg-yellow-100'
                      : ''
                  }`}
                >
                  <TableCell>
                    <Link href={`/admin/employees/${employee.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {employee.hrProfile?.photoUrl || employee.image ? (
                          <img
                            src={employee.hrProfile?.photoUrl || employee.image || ''}
                            alt={employee.name || employee.email}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.name || 'No name'}
                        </div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm hidden lg:table-cell">
                    {employee.hrProfile?.employeeId || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {employee.hrProfile?.designation || <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(() => {
                      const role = deriveAccessRole(employee);
                      const style = ROLE_STYLES[role];
                      const Icon = style.icon;
                      return (
                        <Badge variant="secondary" className={`gap-1 text-xs ${style.bg} ${style.text} hover:${style.bg}`}>
                          <Icon className="h-3 w-3" />
                          {role}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                      <Package className="h-3.5 w-3.5" />
                      <span className="font-semibold">{employee._count?.assets ?? 0}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden xl:table-cell">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium text-sm">
                        {calculateTenure(employee.hrProfile?.dateOfJoining || null)}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden lg:table-cell">
                    {employee.hrProfile?.onboardingComplete ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span className="font-medium text-sm">Complete</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-orange-50 text-orange-700">
                        <Circle className="h-3.5 w-3.5" />
                        <span className="font-medium text-sm">
                          {employee.hrProfile?.onboardingStep
                            ? `Step ${employee.hrProfile.onboardingStep}/8`
                            : 'Not Started'}
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <EmployeeActions employeeId={employee.id} />
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
