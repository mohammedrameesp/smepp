'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Calendar, Clock, Phone, ExternalLink, Info } from 'lucide-react';
import Link from 'next/link';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';
import {
  getLeaveStatusVariant,
  getDateRangeText,
  formatLeaveDays,
  getRequestTypeText,
  canCancelLeaveRequest,
  canEditLeaveRequest,
} from '@/features/leave/lib/leave-utils';
import { LeaveRequestHistory, CancelLeaveDialog } from '@/features/leave/components';
import { LeaveStatus, LeaveRequestType } from '@prisma/client';
import { PageHeader, PageContent } from '@/components/ui/page-header';

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
      <>
        <PageHeader
          title="Loading..."
          subtitle="Please wait"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Leave', href: '/employee/leave' },
            { label: 'Request Details' }
          ]}
        />
        <PageContent className="max-w-3xl">
          <div className="text-center py-12 text-slate-500">Loading request details...</div>
        </PageContent>
      </>
    );
  }

  if (error || !request) {
    return (
      <>
        <PageHeader
          title="Error"
          subtitle="Unable to load leave request"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Leave', href: '/employee/leave' },
            { label: 'Request Details' }
          ]}
        />
        <PageContent className="max-w-3xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <p className="text-red-600 font-medium mb-4">{error || 'Leave request not found'}</p>
            <Link href="/employee/leave">
              <Button variant="outline" size="sm">Back to My Leave</Button>
            </Link>
          </div>
        </PageContent>
      </>
    );
  }

  const canCancel = canCancelLeaveRequest(request.status, new Date(request.startDate));
  const canEdit = canEditLeaveRequest(request.status, new Date(request.startDate));

  return (
    <>
      <PageHeader
        title={request.requestNumber}
        subtitle={`Submitted on ${new Date(request.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Leave', href: '/employee/leave' },
          { label: 'Request Details' }
        ]}
        badge={{
          text: request.status,
          variant: getLeaveStatusVariant(request.status) as 'default' | 'success' | 'warning' | 'destructive' | 'info'
        }}
        actions={
          <div className="flex items-center gap-2">
            {canCancel && (
              <CancelLeaveDialog
                requestId={request.id}
                requestNumber={request.requestNumber}
                onCancelled={handleCancelled}
              />
            )}
            <Link href="/employee/leave">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to My Leave
              </Button>
            </Link>
          </div>
        }
      />

      <PageContent className="max-w-3xl">
        {/* Leave Details */}
        <div className="mb-6">
          <DetailCard icon={Calendar} iconColor="purple" title="Leave Details" subtitle="Request information and dates">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: request.leaveType.color }}
                />
                <span className="font-medium text-lg text-slate-900">{request.leaveType.name}</span>
              </div>

              <InfoFieldGrid columns={2}>
                <InfoField
                  label="Date Range"
                  value={getDateRangeText(new Date(request.startDate), new Date(request.endDate))}
                />
                <InfoField label="Duration" value={formatLeaveDays(request.totalDays)} />
                {!request.leaveType.accrualBased && (
                  <InfoField label="Request Type" value={getRequestTypeText(request.requestType)} />
                )}
              </InfoFieldGrid>

              {request.reason && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Reason</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-900">{request.reason}</div>
                </div>
              )}

              {request.documentUrl && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Supporting Document</p>
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
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Emergency Contact
                  </p>
                  <div>
                    {request.emergencyContact && (
                      <p className="font-medium text-slate-900">{request.emergencyContact}</p>
                    )}
                    {request.emergencyPhone && (
                      <p className="text-slate-600">{request.emergencyPhone}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DetailCard>
        </div>

        {/* Balance Summary */}
        {balance && (
          <div className="mb-6">
            <DetailCard icon={Info} iconColor="emerald" title="Balance Summary" subtitle={`${request.leaveType.name} - ${new Date(request.startDate).getFullYear()}`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="text-2xl font-bold text-slate-900">
                    {(Number(balance.entitlement) + Number(balance.carriedForward) + Number(balance.adjustment)).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Total Entitlement</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-600">
                    {Number(balance.used)}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Used</div>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-600">
                    {Number(balance.pending)}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Pending</div>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <div className="text-2xl font-bold text-emerald-600">
                    {(Number(balance.entitlement) + Number(balance.carriedForward) + Number(balance.adjustment) - Number(balance.used) - Number(balance.pending)).toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">Remaining</div>
                </div>
              </div>
              {Number(balance.carriedForward) > 0 && (
                <div className="mt-4 text-sm text-slate-600 bg-blue-50 p-3 rounded-lg">
                  Includes {Number(balance.carriedForward)} days carried forward from previous year
                </div>
              )}
            </DetailCard>
          </div>
        )}

        {/* Status Details */}
        {(request.approverNotes || request.rejectionReason || request.cancellationReason) && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                request.status === 'APPROVED' ? 'bg-emerald-100' :
                request.status === 'REJECTED' ? 'bg-red-100' : 'bg-slate-100'
              }`}>
                <Info className={`h-5 w-5 ${
                  request.status === 'APPROVED' ? 'text-emerald-600' :
                  request.status === 'REJECTED' ? 'text-red-600' : 'text-slate-600'
                }`} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  {request.status === 'APPROVED' && 'Approval Notes'}
                  {request.status === 'REJECTED' && 'Rejection Reason'}
                  {request.status === 'CANCELLED' && 'Cancellation Reason'}
                </h2>
                <p className="text-sm text-slate-500">Status information</p>
              </div>
            </div>
            <div className="p-5">
              {request.approver && request.status !== 'CANCELLED' && (
                <div className="mb-3 p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Processed by</p>
                  <p className="font-medium text-slate-900">{request.approver.name}</p>
                </div>
              )}
              {request.approverNotes && (
                <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800">
                  {request.approverNotes}
                </div>
              )}
              {request.rejectionReason && (
                <div className="p-4 bg-red-50 rounded-xl text-red-800">
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

        {/* History */}
        <DetailCard icon={Clock} iconColor="blue" title="History" subtitle="Request activity timeline">
          <LeaveRequestHistory history={request.history} />
        </DetailCard>
      </PageContent>
    </>
  );
}
