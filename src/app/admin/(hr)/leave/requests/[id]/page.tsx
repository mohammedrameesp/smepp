'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { FileText, User, Calendar, Clock, Phone, Mail, ExternalLink, AlertCircle } from 'lucide-react';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';
import Link from 'next/link';
import {
  getDateRangeText,
  formatLeaveDays,
  getRequestTypeText,
  canCancelLeaveRequest,
  getAnnualLeaveDetails,
} from '@/features/leave/lib/leave-utils';
import { LeaveApprovalActions, LeaveRequestHistory, CancelLeaveDialog } from '@/features/leave/components';
import { ApprovalChainStatus } from '@/features/leave/components/approval-chain-status';
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
  member: {
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
  approvalChain?: Array<{
    id: string;
    levelOrder: number;
    requiredRole: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
    approverId: string | null;
    approver: {
      id: string;
      name: string | null;
      email: string;
    } | null;
    actionAt: string | null;
    notes: string | null;
  }> | null;
  approvalSummary?: {
    totalSteps: number;
    completedSteps: number;
    currentStep: number | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
    canCurrentUserApprove?: boolean;
  } | null;
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
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [accrued, setAccrued] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
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

      // Fetch balance for this member and leave type
      if (data.member?.id && data.leaveType?.id) {
        const year = new Date(data.startDate).getFullYear();
        const [balanceResponse, userResponse] = await Promise.all([
          fetch(`/api/leave/balances?memberId=${data.member.id}&leaveTypeId=${data.leaveType.id}&year=${year}`),
          fetch(`/api/users/${data.member.id}`),
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
  }, [params.id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Map status to badge variant
  const getStatusBadgeVariant = (status: LeaveStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Leave', href: '/admin/leave' },
            { label: 'Requests', href: '/admin/leave/requests' },
            { label: '...' },
          ]}
        />
        <PageContent>
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
          </div>
        </PageContent>
      </>
    );
  }

  if (error || !request) {
    return (
      <>
        <PageHeader
          title="Not Found"
          breadcrumbs={[
            { label: 'Leave', href: '/admin/leave' },
            { label: 'Requests', href: '/admin/leave/requests' },
            { label: 'Error' },
          ]}
        />
        <PageContent>
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
        </PageContent>
      </>
    );
  }

  const canCancel = canCancelLeaveRequest(request.status, new Date(request.startDate));

  return (
    <>
      <PageHeader
        title={request.requestNumber}
        subtitle={
          request.createdBy
            ? `Leave request from ${request.member.name} (submitted by ${request.createdBy.name || request.createdBy.email})`
            : `Leave request from ${request.member.name}`
        }
        breadcrumbs={[
          { label: 'Leave', href: '/admin/leave' },
          { label: 'Requests', href: '/admin/leave/requests' },
          { label: request.requestNumber },
        ]}
        badge={{
          text: request.status,
          variant: getStatusBadgeVariant(request.status),
        }}
        actions={
          <div className="flex gap-2">
            {request.status === 'PENDING' && (
              <LeaveApprovalActions
                requestId={request.id}
                onApproved={fetchRequest}
                onRejected={fetchRequest}
                approvalChain={request.approvalChain || null}
                approvalSummary={request.approvalSummary || null}
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
        }
      />

      <PageContent>
        <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Leave Details Card */}
          <DetailCard icon={Calendar} iconColor="blue" title="Leave Details" subtitle="Request information">
            <div className="space-y-5">
              {/* Leave Type */}
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: request.leaveType.color, boxShadow: `0 0 0 4px ${request.leaveType.color}30` }}
                />
                <span className="text-lg font-semibold text-slate-900">{request.leaveType.name}</span>
              </div>

              {/* Details Grid */}
              <InfoFieldGrid columns={2}>
                <InfoField
                  label="Date Range"
                  value={getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                />
                <InfoField label="Duration" value={formatLeaveDays(request.totalDays)} />
                {!request.leaveType.accrualBased && (
                  <InfoField label="Request Type" value={getRequestTypeText(request.requestType)} />
                )}
                <InfoField
                  label="Submitted"
                  value={new Date(request.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                />
              </InfoFieldGrid>

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
          </DetailCard>

          {/* Approval Chain Card */}
          {request.approvalChain && request.approvalChain.length > 0 && (
            <ApprovalChainStatus
              approvalChain={request.approvalChain}
              approvalSummary={request.approvalSummary || null}
            />
          )}

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
          <DetailCard icon={Clock} iconColor="purple" title="History" subtitle="Activity timeline">
            <LeaveRequestHistory history={request.history} />
          </DetailCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Employee Card */}
          <DetailCard icon={User} iconColor="indigo" title="Employee">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-semibold">
                  {request.member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{request.member.name}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {request.member.email}
                </p>
              </div>
            </div>
            <Link href={`/admin/users/${request.member.id}`}>
              <Button variant="outline" size="sm" className="w-full">
                View Profile
              </Button>
            </Link>
          </DetailCard>

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
            <DetailCard icon={Phone} iconColor="rose" title="Emergency Contact">
              {request.emergencyContact && (
                <p className="font-medium text-slate-900">{request.emergencyContact}</p>
              )}
              {request.emergencyPhone && (
                <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {request.emergencyPhone}
                </p>
              )}
            </DetailCard>
          )}
        </div>
      </div>
      </PageContent>
    </>
  );
}
