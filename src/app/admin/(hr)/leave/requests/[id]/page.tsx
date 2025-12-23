'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, User, Calendar, Clock, Phone, Mail, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import {
  getLeaveStatusVariant,
  getDateRangeText,
  formatLeaveDays,
  getRequestTypeText,
  canCancelLeaveRequest,
  getAnnualLeaveDetails,
} from '@/lib/leave-utils';
import { LeaveApprovalActions } from '@/components/leave/leave-approval-actions';
import { LeaveRequestHistory } from '@/components/leave/leave-request-history';
import { CancelLeaveDialog } from '@/components/leave/cancel-leave-dialog';
import { LeaveStatus, LeaveRequestType } from '@prisma/client';

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

interface LeaveBalance {
  id: string;
  entitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
}

export default function AdminLeaveRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [accrued, setAccrued] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/leave/requests/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Leave request not found');
        }
        throw new Error('Failed to fetch leave request');
      }
      const data = await response.json();
      setRequest(data);

      // Fetch balance for this user and leave type
      if (data.user?.id && data.leaveType?.id) {
        const year = new Date(data.startDate).getFullYear();
        const [balanceResponse, userResponse] = await Promise.all([
          fetch(`/api/leave/balances?userId=${data.user.id}&leaveTypeId=${data.leaveType.id}&year=${year}`),
          fetch(`/api/users/${data.user.id}`),
        ]);

        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.balances && balanceData.balances.length > 0) {
            setBalance(balanceData.balances[0]);
          }
        }

        // Calculate accrued for accrual-based leave types
        if (data.leaveType.accrualBased && userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.hrProfile?.dateOfJoining) {
            const dateOfJoining = new Date(userData.hrProfile.dateOfJoining);
            const annualDetails = getAnnualLeaveDetails(dateOfJoining, year, new Date());
            setAccrued(annualDetails.accrued);
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-red-600 mb-4">{error || 'Leave request not found'}</p>
              <Link href="/admin/leave/requests">
                <Button variant="outline">Back to Requests</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canCancel = canCancelLeaveRequest(request.status, new Date(request.startDate));

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/leave/requests">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requests
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
                Leave request from {request.user.name}
              </p>
            </div>

            <div className="flex gap-2">
              {request.status === 'PENDING' && (
                <LeaveApprovalActions
                  requestId={request.id}
                  onApproved={fetchRequest}
                  onRejected={fetchRequest}
                />
              )}
              {canCancel && (
                <CancelLeaveDialog
                  requestId={request.id}
                  requestNumber={request.requestNumber}
                  onCancelled={fetchRequest}
                />
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Leave Details */}
            <Card>
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
                  <div>
                    <div className="text-sm text-gray-500">Submitted</div>
                    <div className="font-medium">
                      {new Date(request.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
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
              </CardContent>
            </Card>

            {/* Status Details */}
            {(request.approverNotes || request.rejectionReason || request.cancellationReason) && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {request.status === 'APPROVED' && 'Approval Details'}
                    {request.status === 'REJECTED' && 'Rejection Details'}
                    {request.status === 'CANCELLED' && 'Cancellation Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {request.approver && (
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Employee Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Employee
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium text-lg">{request.user.name}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="h-3 w-3" />
                    {request.user.email}
                  </div>
                </div>
                <Link href={`/admin/users/${request.user.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Balance Summary */}
            {balance && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Balance Summary
                  </CardTitle>
                  <CardDescription>
                    {request.leaveType.name} - {new Date(request.startDate).getFullYear()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Entitlement</span>
                    <span className="font-medium">{Number(balance.entitlement)} days</span>
                  </div>
                  {request.leaveType.accrualBased && accrued !== null && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Accrued (Pro-rata)</span>
                      <span className="font-medium text-blue-600">{accrued.toFixed(1)} days</span>
                    </div>
                  )}
                  {Number(balance.carriedForward) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Carried Forward</span>
                      <span className="font-medium text-blue-600">+{Number(balance.carriedForward)} days</span>
                    </div>
                  )}
                  {Number(balance.adjustment) !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Adjustment</span>
                      <span className={`font-medium ${Number(balance.adjustment) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(balance.adjustment) > 0 ? '+' : ''}{Number(balance.adjustment)} days
                      </span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Used</span>
                    <span className="font-medium text-red-600">-{Number(balance.used)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Pending</span>
                    <span className="font-medium text-amber-600">{Number(balance.pending)} days</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Remaining</span>
                    <span className="font-bold text-green-600">
                      {(() => {
                        const effectiveEntitlement = request.leaveType.accrualBased && accrued !== null
                          ? accrued
                          : Number(balance.entitlement);
                        return (effectiveEntitlement + Number(balance.carriedForward) + Number(balance.adjustment) - Number(balance.used) - Number(balance.pending)).toFixed(1);
                      })()} days
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emergency Contact */}
            {(request.emergencyContact || request.emergencyPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Emergency Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {request.emergencyContact && (
                    <div className="font-medium">{request.emergencyContact}</div>
                  )}
                  {request.emergencyPhone && (
                    <div className="text-sm text-gray-500">{request.emergencyPhone}</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
