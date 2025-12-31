'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, User, Calendar, Clock, Phone, Mail, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import {
  getLeaveStatusVariant,
  getDateRangeText,
  formatLeaveDays,
  getRequestTypeText,
  canCancelLeaveRequest,
  getAnnualLeaveDetails,
} from '@/lib/leave-utils';
import { LeaveApprovalActions, LeaveRequestHistory, CancelLeaveDialog } from '@/components/domains/hr/leave';
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
  createdBy?: {
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

// Status badge styles
const statusStyles: Record<LeaveStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
  REJECTED: { bg: 'bg-rose-100', text: 'text-rose-700', icon: XCircle },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-700', icon: XCircle },
};

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
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="font-semibold text-slate-900 text-lg mb-1">{error || 'Leave request not found'}</h3>
          <p className="text-slate-500 mb-4">We couldn&apos;t find the leave request you&apos;re looking for.</p>
          <Link href="/admin/leave/requests">
            <Button variant="outline">Back to Requests</Button>
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = canCancelLeaveRequest(request.status, new Date(request.startDate));
  const StatusIcon = statusStyles[request.status]?.icon || Clock;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/leave/requests"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {request.requestNumber}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusStyles[request.status]?.bg} ${statusStyles[request.status]?.text}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {request.status}
              </span>
            </div>
            <p className="text-slate-500">
              Leave request from <span className="font-medium text-slate-700">{request.user.name}</span>
            </p>
            {request.createdBy && (
              <p className="text-sm text-slate-400 mt-1">
                Submitted by <span className="font-medium text-slate-600">{request.createdBy.name || request.createdBy.email}</span> on behalf of employee
              </p>
            )}
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leave Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Leave Details</h2>
                <p className="text-sm text-slate-500">Request information</p>
              </div>
            </div>
            <div className="p-5 space-y-5">
              {/* Leave Type */}
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: request.leaveType.color, boxShadow: `0 0 0 4px ${request.leaveType.color}30` }}
                />
                <span className="text-lg font-semibold text-slate-900">{request.leaveType.name}</span>
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date Range</p>
                  <p className="font-semibold text-slate-900">
                    {getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Duration</p>
                  <p className="font-semibold text-slate-900">{formatLeaveDays(request.totalDays)}</p>
                </div>
                {!request.leaveType.accrualBased && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Request Type</p>
                    <p className="font-semibold text-slate-900">{getRequestTypeText(request.requestType)}</p>
                  </div>
                )}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Submitted</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(request.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {request.reason && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Reason</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-700">{request.reason}</div>
                </div>
              )}

              {/* Document */}
              {request.documentUrl && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Supporting Document</p>
                  <a
                    href={request.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    View Document
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Status Details Card */}
          {(request.approverNotes || request.rejectionReason || request.cancellationReason) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">
                  {request.status === 'APPROVED' && 'Approval Details'}
                  {request.status === 'REJECTED' && 'Rejection Details'}
                  {request.status === 'CANCELLED' && 'Cancellation Details'}
                </h2>
              </div>
              <div className="p-5">
                {request.approver && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Processed by</p>
                    <p className="font-medium text-slate-900">{request.approver.name}</p>
                  </div>
                )}
                {request.approverNotes && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800">
                    {request.approverNotes}
                  </div>
                )}
                {request.rejectionReason && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
                    {request.rejectionReason}
                  </div>
                )}
                {request.cancellationReason && (
                  <div className="p-4 bg-slate-100 rounded-xl text-slate-700">
                    {request.cancellationReason}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">History</h2>
                <p className="text-sm text-slate-500">Activity timeline</p>
              </div>
            </div>
            <div className="p-5">
              <LeaveRequestHistory history={request.history} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employee Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Employee</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold">
                    {request.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{request.user.name}</p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {request.user.email}
                  </p>
                </div>
              </div>
              <Link href={`/admin/users/${request.user.id}`}>
                <Button variant="outline" size="sm" className="w-full">
                  View Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Balance Summary Card */}
          {balance && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Balance Summary</h2>
                <p className="text-sm text-slate-500">
                  {request.leaveType.name} - {new Date(request.startDate).getFullYear()}
                </p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">Entitlement</span>
                  <span className="font-semibold text-slate-900">{Number(balance.entitlement)} days</span>
                </div>
                {request.leaveType.accrualBased && accrued !== null && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Accrued (Pro-rata)</span>
                    <span className="font-semibold text-blue-600">{accrued.toFixed(1)} days</span>
                  </div>
                )}
                {Number(balance.carriedForward) > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Carried Forward</span>
                    <span className="font-semibold text-blue-600">+{Number(balance.carriedForward)} days</span>
                  </div>
                )}
                {Number(balance.adjustment) !== 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Adjustment</span>
                    <span className={`font-semibold ${Number(balance.adjustment) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {Number(balance.adjustment) > 0 ? '+' : ''}{Number(balance.adjustment)} days
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3 mt-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Used</span>
                    <span className="font-semibold text-rose-600">-{Number(balance.used)} days</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-500">Pending</span>
                    <span className="font-semibold text-amber-600">{Number(balance.pending)} days</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3 mt-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-medium text-slate-700">Remaining</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {(() => {
                        const effectiveEntitlement = request.leaveType.accrualBased && accrued !== null
                          ? accrued
                          : Number(balance.entitlement);
                        return (effectiveEntitlement + Number(balance.carriedForward) + Number(balance.adjustment) - Number(balance.used) - Number(balance.pending)).toFixed(1);
                      })()} days
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Contact Card */}
          {(request.emergencyContact || request.emergencyPhone) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                  <Phone className="h-5 w-5 text-rose-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Emergency Contact</h2>
              </div>
              <div className="p-5">
                {request.emergencyContact && (
                  <p className="font-medium text-slate-900">{request.emergencyContact}</p>
                )}
                {request.emergencyPhone && (
                  <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                    <Phone className="h-3.5 w-3.5" />
                    {request.emergencyPhone}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
