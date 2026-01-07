/**
 * @file page.tsx
 * @description Employee asset request detail page - view and respond to individual requests
 * @module app/employee/(operations)/asset-requests/[id]
 * @updated 2026-01-06 - Added onSuccess callback for page refresh after accept/decline
 *
 * Features:
 * - Client-side component fetching request via API for real-time updates
 * - Accept/Decline buttons for pending assignments
 * - Cancel button for pending requests (before admin approval)
 * - Asset details with link to full asset page
 * - Request reason and notes display
 * - Processing information (who approved/rejected, when, response notes)
 * - Request history timeline with all status changes
 * - Action required alert for pending acceptance
 * - Loading skeleton during data fetch
 * - Error state handling with back navigation
 *
 * Available Actions:
 * - Accept: Confirm assignment of asset to user
 * - Decline: Reject the assignment
 * - Cancel: Withdraw pending request (PENDING_ADMIN_APPROVAL or PENDING_RETURN_APPROVAL only)
 *
 * Access: Current user only (API enforces ownership)
 * Route: /employee/asset-requests/[id]
 */

'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AssetRequestStatusBadge, AssetRequestTypeBadge, AssetAcceptDialog } from '@/components/domains/operations/asset-requests';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { ArrowLeft, Package, User, Clock, FileText, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface AssetRequest {
  id: string;
  requestNumber: string;
  type: string;
  status: string;
  reason: string | null;
  notes: string | null;
  processorNotes: string | null;
  createdAt: string;
  processedAt: string | null;
  asset: {
    id: string;
    assetTag: string | null;
    model: string;
    brand: string | null;
    type: string;
    configuration: string | null;
    location: { id: string; name: string } | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  assignedByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  processedByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  history: {
    id: string;
    action: string;
    oldStatus: string | null;
    newStatus: string | null;
    notes: string | null;
    createdAt: string;
    performedBy: {
      name: string | null;
      email: string;
    };
  }[];
}

export default function EmployeeAssetRequestDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const [request, setRequest] = useState<AssetRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [dialogInitialMode, setDialogInitialMode] = useState<'view' | 'accept' | 'decline'>('view');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await fetch(`/api/asset-requests/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Request not found');
        }
        throw new Error('Failed to fetch request');
      }
      const data = await response.json();
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/asset-requests/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel request');
      }

      router.push('/employee/asset-requests');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          subtitle="Please wait while we load the request details"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Assets', href: '/employee/my-assets' },
            { label: 'Requests', href: '/employee/asset-requests' },
            { label: 'Details' }
          ]}
        />
        <PageContent className="max-w-4xl">
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
          subtitle="Unable to load asset request"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'My Assets', href: '/employee/my-assets' },
            { label: 'Requests', href: '/employee/asset-requests' },
            { label: 'Details' }
          ]}
        />
        <PageContent className="max-w-4xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-900 mb-4">{error || 'Request not found'}</p>
            <Link href="/employee/asset-requests">
              <Button variant="outline" size="sm">Back to Requests</Button>
            </Link>
          </div>
        </PageContent>
      </>
    );
  }

  const isPendingAcceptance = request.status === 'PENDING_USER_ACCEPTANCE';
  const canCancel = request.status === 'PENDING_ADMIN_APPROVAL' || request.status === 'PENDING_RETURN_APPROVAL';

  return (
    <>
      <PageHeader
        title={request.requestNumber}
        subtitle={`Submitted on ${formatDateTime(request.createdAt)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'My Assets', href: '/employee/my-assets' },
          { label: 'Requests', href: '/employee/asset-requests' },
          { label: 'Details' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isPendingAcceptance && (
              <>
                <Button
                  variant="outline"
                  size="default"
                  className="border-2"
                  onClick={() => {
                    setDialogInitialMode('decline');
                    setShowAcceptDialog(true);
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  size="default"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white border-2 border-emerald-800 shadow-sm"
                  onClick={() => {
                    setDialogInitialMode('accept');
                    setShowAcceptDialog(true);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isCancelling ? 'Cancelling...' : 'Cancel Request'}
              </Button>
            )}
            <Link href="/employee/asset-requests">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <AssetRequestTypeBadge type={request.type} />
          <AssetRequestStatusBadge status={request.status} />
        </div>
      </PageHeader>

      <PageContent className="max-w-4xl">

        {/* Alert for pending acceptance */}
        {isPendingAcceptance && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Action Required</h3>
                <p className="text-sm text-amber-700 mt-1">
                  This asset has been assigned to you. Please accept or decline the assignment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Asset Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Asset Details</h2>
                <p className="text-sm text-slate-500">Information about the requested asset</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Model</p>
                  <p className="font-semibold text-slate-900">{request.asset.model}</p>
                </div>
                {request.asset.brand && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Brand</p>
                    <p className="font-semibold text-slate-900">{request.asset.brand}</p>
                  </div>
                )}
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Type</p>
                  <p className="font-semibold text-slate-900">{request.asset.type}</p>
                </div>
                {request.asset.assetTag && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Asset Tag</p>
                    <p className="font-mono font-semibold text-slate-900">{request.asset.assetTag}</p>
                  </div>
                )}
                {request.asset.configuration && (
                  <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Configuration</p>
                    <p className="font-semibold text-slate-900">{request.asset.configuration}</p>
                  </div>
                )}
                {request.asset.location && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Location</p>
                    <p className="font-semibold text-slate-900">{request.asset.location.name}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Link href={`/employee/assets/${request.asset.id}`}>
                  <Button variant="outline" size="sm">View Full Asset Details</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Request Details</h2>
                <p className="text-sm text-slate-500">Additional information about this request</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {request.reason && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Reason</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-900">{request.reason}</div>
                </div>
              )}
              {request.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-900">{request.notes}</div>
                </div>
              )}
              {request.assignedByUser && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Assigned By</p>
                  <p className="flex items-center gap-2 font-medium text-slate-900">
                    <User className="h-4 w-4 text-slate-400" />
                    {request.assignedByUser.name || request.assignedByUser.email}
                  </p>
                </div>
              )}
              {request.processedAt && request.processedByUser && (
                <>
                  <Separator className="my-4" />
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Processed By</p>
                    <p className="flex items-center gap-2 font-medium text-slate-900">
                      <User className="h-4 w-4 text-slate-400" />
                      {request.processedByUser.name || request.processedByUser.email}
                      <span className="text-slate-500 text-sm">on {formatDateTime(request.processedAt)}</span>
                    </p>
                  </div>
                  {request.processorNotes && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Response Notes</p>
                      <div className="p-4 bg-slate-50 rounded-xl text-slate-900">{request.processorNotes}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* History */}
          {request.history && request.history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">History</h2>
                  <p className="text-sm text-slate-500">Request activity timeline</p>
                </div>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {request.history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex gap-4 ${index !== request.history.length - 1 ? 'pb-4 border-b border-slate-200' : ''}`}
                    >
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-400"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{entry.action}</span>
                          {entry.newStatus && (
                            <AssetRequestStatusBadge status={entry.newStatus} />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          by {entry.performedBy.name || entry.performedBy.email} on {formatDateTime(entry.createdAt)}
                        </p>
                        {entry.notes && (
                          <p className="text-sm mt-2 text-slate-600 p-3 bg-slate-50 rounded-lg">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Accept/Decline Dialog */}
        {isPendingAcceptance && (
          <AssetAcceptDialog
            requestId={request.id}
            asset={request.asset}
            assignedBy={request.assignedByUser}
            notes={request.notes}
            open={showAcceptDialog}
            onOpenChange={setShowAcceptDialog}
            onSuccess={fetchRequest}
            initialMode={dialogInitialMode}
          />
        )}
      </PageContent>
    </>
  );
}
