'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Calendar, Clock, Phone, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  getLeaveStatusVariant,
  getDateRangeText,
  formatLeaveDays,
  getRequestTypeText,
  canCancelLeaveRequest,
  canEditLeaveRequest,
} from '@/lib/leave-utils';
import { LeaveRequestHistory, CancelLeaveDialog } from '@/components/domains/hr/leave';
import { LeaveStatus, LeaveRequestType } from '@prisma/client';
import { CardDescription } from '@/components/ui/card';

interface LeaveBalance {
  id: string;
  entitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
}

interface LeaveRequest {
  id: string;
  requestNumber: string;
  startDate: string;
  endDate: string;
  requestType: LeaveRequestType;
  totalDays: number | string;
  reason?: string | null;
  documentUrl?: string | null;
  status: LeaveStatus;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  approverNotes?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  leaveType: {
    id: string;
    name: string;
    color: string;
    requiresDocument: boolean;
    accrualBased?: boolean;
  };
  approver?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  history: Array<{
    id: string;
    action: string;
    oldStatus?: LeaveStatus | null;
    newStatus?: LeaveStatus | null;
    notes?: string | null;
    changes?: Record<string, unknown> | null;
    createdAt: string;
    performedBy: {
      id: string;
      name: string | null;
    };
  }>;
}

export default function EmployeeLeaveRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/leave/requests/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Leave request not found');
        }
        if (response.status === 401) {
          throw new Error('You are not authorized to view this request');
        }
        throw new Error('Failed to fetch leave request');
      }
      const data = await response.json();
      setRequest(data);

      // Fetch balance for this leave type
      if (data.leaveType?.id) {
        const year = new Date(data.startDate).getFullYear();
        const balanceResponse = await fetch(
          `/api/leave/balances?leaveTypeId=${data.leaveType.id}&year=${year}`
        );
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.balances && balanceData.balances.length > 0) {
            setBalance(balanceData.balances[0]);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [params.id]);

  const handleCancelled = () => {
    router.push('/employee/leave');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 mb-4">{error || 'Leave request not found'}</p>
              <Link href="/employee/leave">
                <Button variant="outline">Back to My Leave</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canCancel = canCancelLeaveRequest(request.status, new Date(request.startDate));
  const canEdit = canEditLeaveRequest(request.status, new Date(request.startDate));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/employee/leave">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Leave
            </Button>
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {request.requestNumber}
                </h1>
                <Badge variant={getLeaveStatusVariant(request.status)}>
                  {request.status}
                </Badge>
              </div>
              <p className="text-gray-600">
                Submitted on {new Date(request.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            {canCancel && (
              <CancelLeaveDialog
                requestId={request.id}
                requestNumber={request.requestNumber}
                onCancelled={handleCancelled}
              />
            )}
          </div>
        </div>

        {/* Leave Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: request.leaveType.color }}
              />
              <span className="font-medium text-lg">{request.leaveType.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Date Range</div>
                <div className="font-medium">
                  {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Duration</div>
                <div className="font-medium">{formatLeaveDays(request.totalDays)}</div>
              </div>
              {!request.leaveType.accrualBased && (
                <div>
                  <div className="text-sm text-gray-500">Request Type</div>
                  <div className="font-medium">{getRequestTypeText(request.requestType)}</div>
                </div>
              )}
            </div>

            {request.reason && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Reason</div>
                <div className="p-3 bg-gray-50 rounded-md">{request.reason}</div>
              </div>
            )}

            {request.documentUrl && (
              <div>
                <div className="text-sm text-gray-500 mb-1">Supporting Document</div>
                <a
                  href={request.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  View Document
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {(request.emergencyContact || request.emergencyPhone) && (
              <div className="border-t pt-4">
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency Contact
                </div>
                <div>
                  {request.emergencyContact && (
                    <div className="font-medium">{request.emergencyContact}</div>
                  )}
                  {request.emergencyPhone && (
                    <div className="text-gray-600">{request.emergencyPhone}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Summary */}
        {balance && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Balance Summary
              </CardTitle>
              <CardDescription>
                {request.leaveType.name} - {new Date(request.startDate).getFullYear()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {(Number(balance.entitlement) + Number(balance.carriedForward) + Number(balance.adjustment)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">Total Entitlement</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {Number(balance.used)}
                  </div>
                  <div className="text-sm text-gray-500">Used</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-600">
                    {Number(balance.pending)}
                  </div>
                  <div className="text-sm text-gray-500">Pending</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(Number(balance.entitlement) + Number(balance.carriedForward) + Number(balance.adjustment) - Number(balance.used) - Number(balance.pending)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">Remaining</div>
                </div>
              </div>
              {Number(balance.carriedForward) > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  Includes {Number(balance.carriedForward)} days carried forward from previous year
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Details */}
        {(request.approverNotes || request.rejectionReason || request.cancellationReason) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>
                {request.status === 'APPROVED' && 'Approval Notes'}
                {request.status === 'REJECTED' && 'Rejection Reason'}
                {request.status === 'CANCELLED' && 'Cancellation Reason'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.approver && request.status !== 'CANCELLED' && (
                <div className="mb-3">
                  <div className="text-sm text-gray-500">Processed by</div>
                  <div className="font-medium">{request.approver.name}</div>
                </div>
              )}
              {request.approverNotes && (
                <div className="p-3 bg-green-50 rounded-md text-green-800">
                  {request.approverNotes}
                </div>
              )}
              {request.rejectionReason && (
                <div className="p-3 bg-red-50 rounded-md text-red-800">
                  {request.rejectionReason}
                </div>
              )}
              {request.cancellationReason && (
                <div className="p-3 bg-gray-100 rounded-md">
                  {request.cancellationReason}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveRequestHistory history={request.history} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
