/**
 * @file employee-leave-section.tsx
 * @description Leave management section for employee details page, showing balances and recent requests
 * @module components/domains/hr
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LeaveStatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/core/datetime';
import { getAnnualLeaveDetails } from '@/features/leave/lib/leave-utils';
import { ICON_SIZES } from '@/lib/constants';

interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  year: number;
  entitlement: number | string;
  used: number | string;
  pending: number | string;
  carriedForward: number | string;
  adjustment: number | string;
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid: boolean;
  };
}

interface LeaveRequest {
  id: string;
  requestNumber: string;
  startDate: string;
  endDate: string;
  totalDays: number | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reason: string;
  createdAt: string;
  leaveType: {
    name: string;
    color: string;
  };
}

interface EmployeeLeaveSectionProps {
  userId: string;
}

export function EmployeeLeaveSection({ userId }: EmployeeLeaveSectionProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateOfJoining, setDateOfJoining] = useState<Date | null>(null);
  const currentYear = new Date().getFullYear();
  const now = new Date();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel for better performance
        const [balancesRes, requestsRes, userRes] = await Promise.all([
          fetch(`/api/leave/balances?userId=${userId}&year=${currentYear}&ps=100`),
          fetch(`/api/leave/requests?userId=${userId}&ps=10`),
          fetch(`/api/users/${userId}`),
        ]);

        // Process responses
        if (balancesRes.ok) {
          const data = await balancesRes.json();
          setBalances(data.balances || []);
        }

        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setRequests(data.requests || []);
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.hrProfile?.dateOfJoining) {
            setDateOfJoining(new Date(userData.hrProfile.dateOfJoining));
          }
        }
      } catch (error) {
        console.error('Failed to fetch leave data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, currentYear]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">Loading leave data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to get effective entitlement (accrued for Annual Leave)
  const getEffectiveEntitlement = (balance: LeaveBalance) => {
    if (balance.leaveType.name === 'Annual Leave' && dateOfJoining) {
      const annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
      return annualDetails.accrued;
    }
    return Number(balance.entitlement);
  };

  // Calculate totals using effective entitlements
  const totalEntitlement = balances.reduce((sum, b) => sum + getEffectiveEntitlement(b), 0);
  const totalUsed = balances.reduce((sum, b) => sum + Number(b.used), 0);
  const totalPending = balances.reduce((sum, b) => sum + Number(b.pending), 0);
  const totalRemaining = balances.reduce((sum, b) => {
    const effectiveEnt = getEffectiveEntitlement(b);
    return sum + (effectiveEnt + Number(b.carriedForward) + Number(b.adjustment) - Number(b.used) - Number(b.pending));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Entitlement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalEntitlement} days</div>
            <p className="text-xs text-gray-500 mt-1">For {currentYear}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalUsed} days</div>
            <p className="text-xs text-gray-500 mt-1">Approved leave taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalPending} days</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalRemaining.toFixed(1)} days</div>
            <p className="text-xs text-gray-500 mt-1">Available to use</p>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances by Type */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leave Balances ({currentYear})</CardTitle>
            <CardDescription>Balance breakdown by leave type</CardDescription>
          </div>
          <Link href={`/admin/leave/balances?userId=${userId}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className={`${ICON_SIZES.sm} mr-2`} />
              Manage Balances
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className={`${ICON_SIZES.xl} mx-auto mb-2 text-gray-400`} />
              <p>No leave balances found for {currentYear}</p>
              <p className="text-sm mt-1">Initialize balances to start tracking leave</p>
            </div>
          ) : (
            <div className="space-y-4">
              {balances.map((balance) => {
                // Calculate effective entitlement (accrued for Annual Leave)
                const isAnnualLeave = balance.leaveType.name === 'Annual Leave';
                const effectiveEntitlement = getEffectiveEntitlement(balance);
                let annualDetails: { annualEntitlement: number; monthsWorked: number } | null = null;

                if (isAnnualLeave && dateOfJoining) {
                  annualDetails = getAnnualLeaveDetails(dateOfJoining, currentYear, now);
                }

                const total = effectiveEntitlement + Number(balance.carriedForward) + Number(balance.adjustment);
                const remaining = total - Number(balance.used) - Number(balance.pending);
                const usedPercent = total > 0 ? (Number(balance.used) / total) * 100 : 0;
                const pendingPercent = total > 0 ? (Number(balance.pending) / total) * 100 : 0;

                return (
                  <div key={balance.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: balance.leaveType.color }}
                        />
                        <span className="font-medium">{balance.leaveType.name}</span>
                        {balance.leaveType.isPaid ? (
                          <Badge variant="outline" className="text-xs">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-gray-50">Unpaid</Badge>
                        )}
                        {isAnnualLeave && annualDetails && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Accrual ({annualDetails.monthsWorked} mo)
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg">{remaining.toFixed(1)}</span>
                        <span className="text-gray-500 text-sm"> / {total.toFixed(1)} days</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div
                        className="absolute h-full bg-red-400 rounded-full"
                        style={{ width: `${Math.min(usedPercent, 100)}%` }}
                      />
                      <div
                        className="absolute h-full bg-amber-400 rounded-full"
                        style={{ left: `${usedPercent}%`, width: `${Math.min(pendingPercent, 100 - usedPercent)}%` }}
                      />
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500">
                          {isAnnualLeave && annualDetails ? 'Accrued' : 'Entitlement'}
                        </div>
                        <div className="font-medium">
                          {effectiveEntitlement.toFixed(1)}
                          {isAnnualLeave && annualDetails && (
                            <span className="text-gray-400 text-xs ml-1">of {annualDetails.annualEntitlement}/yr</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Carried</div>
                        <div className="font-medium text-blue-600">
                          {Number(balance.carriedForward) > 0 ? `+${Number(balance.carriedForward)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Adjustment</div>
                        <div className={`font-medium ${Number(balance.adjustment) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(balance.adjustment) !== 0 ? (Number(balance.adjustment) >= 0 ? '+' : '') + Number(balance.adjustment) : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Used</div>
                        <div className="font-medium text-red-600">{Number(balance.used)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Pending</div>
                        <div className="font-medium text-amber-600">{Number(balance.pending)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leave Requests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Leave Requests</CardTitle>
            <CardDescription>Latest leave requests from this employee</CardDescription>
          </div>
          <Link href={`/admin/leave/requests?userId=${userId}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className={`${ICON_SIZES.sm} mr-2`} />
              View All Requests
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className={`${ICON_SIZES.xl} mx-auto mb-2 text-gray-400`} />
              <p>No leave requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request #</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-sm">{request.requestNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: request.leaveType.color }}
                        />
                        {request.leaveType.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(new Date(request.startDate))} - {formatDate(new Date(request.endDate))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{Number(request.totalDays)}</TableCell>
                    <TableCell><LeaveStatusBadge status={request.status} showIcon /></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/leave/requests/${request.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
