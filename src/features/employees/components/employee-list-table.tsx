/**
 * @file employee-list-table.tsx
 * @description Paginated employee list table with search, filtering, and export functionality
 * @module components/domains/hr
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Download, User, Package, Clock, RefreshCw, CheckCircle2, Circle, ShieldCheck, Briefcase, UserCog, CircleDollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmployeeActions } from './employee-actions';
import { SPONSORSHIP_TYPES } from '@/lib/data/constants';
import { calculateTenure } from '@/features/employees/lib/hr-utils';
import { getDisplayEmail } from '@/lib/utils/user-display';
import { getRoleClasses, ICON_SIZES } from '@/lib/constants';

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

const ROLE_ICONS: Record<AccessRole, typeof ShieldCheck> = {
  Admin: ShieldCheck,
  Manager: UserCog,
  HR: UserCog,
  Finance: CircleDollarSign,
  Operations: Briefcase,
  Employee: User,
};

interface Employee {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  // Permission flags
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

interface Stats {
  total: number;
  incomplete: number;
  expiringSoon: number;
  expired: number;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function EmployeeListTable() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [, setStats] = useState<Stats>({ total: 0, incomplete: 0, expiringSoon: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [profileStatus, setProfileStatus] = useState<string>('all');
  const [expiryStatus, setExpiryStatus] = useState<string>('all');
  const [sponsorshipFilter, setSponsorshipFilter] = useState<string>('all');
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
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [profileStatus, expiryStatus, sponsorshipFilter]);

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        p: pagination.page.toString(),
        ps: pagination.pageSize.toString(),
        sort: sortBy,
        order: sortOrder,
      });

      if (debouncedSearch) params.append('q', debouncedSearch);
      if (profileStatus !== 'all') params.append('profileStatus', profileStatus);
      if (expiryStatus !== 'all') params.append('expiryStatus', expiryStatus);
      if (sponsorshipFilter !== 'all') params.append('sponsorshipType', sponsorshipFilter);

      const response = await fetch(`/api/employees?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch employees');
      }

      const data = await response.json();
      setEmployees(data.employees);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch employees';
      setError(message);
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, profileStatus, expiryStatus, sponsorshipFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

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
      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <AlertTriangle className={ICON_SIZES.sm} />
          <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchEmployees} className="ml-4">
              <RefreshCw className={`${ICON_SIZES.sm} mr-1`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search name, email, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={profileStatus} onValueChange={setProfileStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Profile Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Profiles</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="incomplete">Incomplete</SelectItem>
          </SelectContent>
        </Select>
        <Select value={expiryStatus} onValueChange={setExpiryStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Expiry Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sponsorshipFilter} onValueChange={setSponsorshipFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Sponsorship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sponsorships</SelectItem>
            {SPONSORSHIP_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-600">
        <div>
          Showing {employees.length > 0 ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} employees
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className={`${ICON_SIZES.sm} animate-spin`} />}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className={`${ICON_SIZES.sm} mr-1`} />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 hidden lg:table-cell"
                onClick={() => toggleSort('employeeId')}
              >
                Employee ID {sortBy === 'employeeId' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="hidden xl:table-cell">Designation</TableHead>
              <TableHead className="hidden md:table-cell">Access</TableHead>
              <TableHead className="text-center">Assets</TableHead>
              <TableHead className="text-center hidden xl:table-cell">Tenure</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Onboarding</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className={`${ICON_SIZES.xl} animate-spin mx-auto text-gray-400`} />
                  <p className="text-gray-500 mt-2">Loading employees...</p>
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  {debouncedSearch || profileStatus !== 'all' || expiryStatus !== 'all'
                    ? 'No employees match your filters'
                    : 'No employees found'}
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow
                  key={employee.id}
                  onClick={() => router.push(`/admin/employees/${employee.id}`)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    employee.expiryStatus.overall === 'expired'
                      ? 'bg-red-50 hover:bg-red-100'
                      : employee.expiryStatus.overall === 'expiring'
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
                            alt={employee.name || 'Unnamed'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className={`${ICON_SIZES.md} text-gray-400`} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {employee.name || 'No name'}
                        </div>
                        {getDisplayEmail(employee.email) && (
                          <div className="text-sm text-gray-500">{getDisplayEmail(employee.email)}</div>
                        )}
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
                      const roleClasses = getRoleClasses(role);
                      const Icon = ROLE_ICONS[role];
                      return (
                        <Badge variant="secondary" className={`gap-1 text-xs ${roleClasses} hover:${roleClasses.split(' ')[0]}`}>
                          <Icon className={ICON_SIZES.xs} />
                          {role}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                      <Package className="h-3.5 w-3.5" />
                      <span className="font-semibold">{employee._count.assets}</span>
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
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
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
