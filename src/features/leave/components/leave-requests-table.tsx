/**
 * @file leave-requests-table.tsx
 * @description Paginated table component for displaying and filtering leave requests
 * @module components/domains/hr
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight, Loader2, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { getLeaveStatusVariant, getDateRangeText, formatLeaveDays, getRequestTypeText } from '@/features/leave/lib/leave-utils';
import { LeaveStatus } from '@prisma/client';

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

interface LeaveRequest {
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

/**
 * Get detailed status text for pending requests showing current approval level.
 * Shows "(You)" when the current user can approve the pending step.
 */
function getDetailedStatusText(request: LeaveRequest): string {
  if (request.status !== 'PENDING') {
    return request.status;
  }

  const summary = request.approvalSummary;
  if (!summary || !summary.currentStep) {
    return 'PENDING';
  }

  const levelLabel = `L${summary.currentStep.levelOrder}`;

  // Show "(You)" if the current user can approve this step
  if (summary.canCurrentUserApprove) {
    return `Pending ${levelLabel} (You)`;
  }

  const roleName = ROLE_DISPLAY_NAMES[summary.currentStep.requiredRole] || summary.currentStep.requiredRole;
  return `Pending ${levelLabel} (${roleName})`;
}

interface LeaveRequestsTableProps {
  showUser?: boolean;
  memberId?: string;
  basePath?: string;
}

export function LeaveRequestsTable({ showUser = true, memberId, basePath = '/admin/leave/requests' }: LeaveRequestsTableProps) {
  const searchParams = useSearchParams();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'PENDING');
  const [yearFilter, setYearFilter] = useState<string>(searchParams.get('year') || 'all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('p', pagination.page.toString());
      params.set('ps', pagination.pageSize.toString());

      if (search) params.set('q', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (yearFilter && yearFilter !== 'all') params.set('year', yearFilter);
      if (memberId) params.set('memberId', memberId);

      const response = await fetch(`/api/leave/requests?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, statusFilter, yearFilter, memberId]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchRequests();
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleYearChange = (value: string) => {
    setYearFilter(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 sm:gap-4 items-stretch lg:items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by request # or employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
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

        <Select value={yearFilter} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
            {loading ? (
              <TableRow>
                <TableCell colSpan={showUser ? 8 : 7} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                  <p className="text-gray-500 mt-2">Loading leave requests...</p>
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showUser ? 8 : 7} className="text-center py-8">
                  <CalendarDays className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">No leave requests found</p>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
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
                    {new Date(request.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
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
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
