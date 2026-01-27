/**
 * @file leave-requests-table-filtered.tsx
 * @description Table component with client-side filtering for leave requests
 * @module features/leave/components
 *
 * Features:
 * - Instant client-side filtering (no loading spinner)
 * - Search across request number, employee name/email
 * - Status and Year filters
 * - Client-side pagination (50 per page)
 */
'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableFilterBar } from '@/components/ui/table-filter-bar';
import { useClientDataTable } from '@/hooks/use-client-data-table';
import { CalendarDays } from 'lucide-react';
import { getLeaveStatusVariant, getDateRangeText, formatLeaveDays, getRequestTypeText } from '@/features/leave/lib/leave-utils';
import { formatDate } from '@/lib/core/datetime';
import { LeaveStatus } from '@prisma/client';

const PAGE_SIZE = 50;

// Role display names for approval status
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR',
  FINANCE_MANAGER: 'Finance',
  DIRECTOR: 'Director',
};

interface ApprovalSummaryInfo {
  currentStep: {
    levelOrder: number;
    requiredRole: string;
  } | null;
  totalSteps: number;
  completedSteps: number;
  canCurrentUserApprove?: boolean;
}

export interface LeaveRequestItem {
  id: string;
  requestNumber: string;
  startDate: string;
  endDate: string;
  requestType: string;
  totalDays: number | string;
  status: LeaveStatus;
  createdAt: string;
  member: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  leaveType: {
    id: string;
    name: string;
    color: string;
  };
  approver?: {
    id: string;
    name: string | null;
  } | null;
  approvalSummary?: ApprovalSummaryInfo | null;
}

type LeaveFilters = {
  status: string;
  year: string;
  [key: string]: string;
};

/**
 * Get detailed status text for pending requests showing current approval level.
 */
function getDetailedStatusText(request: LeaveRequestItem): string {
  if (request.status !== 'PENDING') {
    return request.status;
  }

  const summary = request.approvalSummary;
  if (!summary || !summary.currentStep) {
    return 'PENDING';
  }

  const levelLabel = `L${summary.currentStep.levelOrder}`;

  if (summary.canCurrentUserApprove) {
    return `Pending ${levelLabel} (You)`;
  }

  const roleName = ROLE_DISPLAY_NAMES[summary.currentStep.requiredRole] || summary.currentStep.requiredRole;
  return `Pending ${levelLabel} (${roleName})`;
}

interface LeaveRequestsTableFilteredProps {
  requests: LeaveRequestItem[];
  showUser?: boolean;
  basePath?: string;
}

export function LeaveRequestsTableFiltered({
  requests,
  showUser = true,
  basePath = '/admin/leave/requests'
}: LeaveRequestsTableFilteredProps) {
  const [page, setPage] = useState(1);

  // Get years for filter
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  }, []);

  // Client-side filtering
  const {
    filteredData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    resetFilters,
  } = useClientDataTable<LeaveRequestItem, LeaveFilters>({
    data: requests,
    searchFields: ['requestNumber'],
    defaultSort: 'createdAt',
    defaultOrder: 'desc',
    initialFilters: { status: 'PENDING', year: 'all' },
    filterFn: (item, key, value) => {
      if (!value || value === 'all') return true;

      if (key === 'status') {
        return item.status === value;
      }

      if (key === 'year') {
        const itemYear = new Date(item.startDate).getFullYear();
        return itemYear.toString() === value;
      }

      return true;
    },
  });

  // Additional search for member name/email (nested fields)
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return filteredData;
    const term = searchTerm.toLowerCase();
    return filteredData.filter(req =>
      req.requestNumber.toLowerCase().includes(term) ||
      req.member?.name?.toLowerCase().includes(term) ||
      req.member?.email?.toLowerCase().includes(term) ||
      req.leaveType.name.toLowerCase().includes(term)
    );
  }, [filteredData, searchTerm]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return searchFilteredData.slice(start, start + PAGE_SIZE);
  }, [searchFilteredData, page]);

  const totalPages = Math.ceil(searchFilteredData.length / PAGE_SIZE);

  // Reset page when filters change
  const handleFilterChange = <K extends keyof LeaveFilters>(key: K, value: LeaveFilters[K]) => {
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

  const hasActiveFilters = searchTerm !== '' || filters.status !== 'PENDING' || filters.year !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilterBar
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by request # or employee..."
        resultCount={searchFilteredData.length}
        totalCount={requests.length}
        onClearFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.year} onValueChange={(v) => handleFilterChange('year', v)}>
          <SelectTrigger className="flex-1 min-w-[140px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableFilterBar>

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              {showUser && <TableHead>Employee</TableHead>}
              <TableHead>Leave Type</TableHead>
              <TableHead className="hidden md:table-cell">Dates</TableHead>
              <TableHead className="hidden lg:table-cell">Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showUser ? 8 : 7} className="text-center py-8">
                  <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">
                    {hasActiveFilters
                      ? 'No leave requests match your filters'
                      : 'No leave requests found'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((request) => (
                <TableRow
                  key={request.id}
                  className={
                    request.status === 'PENDING' ? 'bg-amber-50/50 hover:bg-amber-100/50' :
                    request.status === 'REJECTED' || request.status === 'CANCELLED' ? 'bg-red-50/50 hover:bg-red-100/50' : ''
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {request.requestNumber}
                  </TableCell>
                  {showUser && (
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.member?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{request.member?.email}</div>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: request.leaveType.color }}
                      />
                      {request.leaveType.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm">
                      {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                    </div>
                    {request.requestType !== 'FULL_DAY' && (
                      <div className="text-xs text-gray-500">
                        {getRequestTypeText(request.requestType as 'FULL_DAY' | 'HALF_DAY_AM' | 'HALF_DAY_PM')}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {formatLeaveDays(request.totalDays)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLeaveStatusVariant(request.status)} className="whitespace-nowrap">
                      {getDetailedStatusText(request)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 hidden lg:table-cell">
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`${basePath}/${request.id}`}>
                        View
                      </Link>
                    </Button>
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
