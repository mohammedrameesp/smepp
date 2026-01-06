/**
 * @file page.tsx
 * @description Employee asset request detail page - view and respond to individual requests
 * @module app/employee/(operations)/asset-requests/[id]
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AssetRequestStatusBadge, AssetRequestTypeBadge, AssetAcceptDialog } from '@/components/domains/operations/asset-requests';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { ArrowLeft, Package, User, Clock, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
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
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">{error || 'Request not found'}</p>
              <Link href="/employee/asset-requests">
                <Button variant="outline" className="mt-4">
                  Back to Requests
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isPendingAcceptance = request.status === 'PENDING_USER_ACCEPTANCE';
  const canCancel = request.status === 'PENDING_ADMIN_APPROVAL' || request.status === 'PENDING_RETURN_APPROVAL';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/employee/asset-requests" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Requests
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {request.requestNumber}
                <AssetRequestTypeBadge type={request.type} />
                <AssetRequestStatusBadge status={request.status} />
              </h1>
              <p className="text-gray-600 mt-1">
                Submitted on {formatDateTime(request.createdAt)}
              </p>
            </div>

            <div className="flex gap-2">
              {isPendingAcceptance && (
                <>
                  <Button variant="outline" onClick={() => setShowAcceptDialog(true)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                  <Button onClick={() => setShowAcceptDialog(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                </>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Request'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Alert for pending acceptance */}
        {isPendingAcceptance && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Action Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This asset has been assigned to you. Please accept or decline the assignment.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          {/* Asset Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Model</label>
                  <p className="font-medium">{request.asset.model}</p>
                </div>
                {request.asset.brand && (
                  <div>
                    <label className="text-sm text-gray-500">Brand</label>
                    <p className="font-medium">{request.asset.brand}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm text-gray-500">Type</label>
                  <p className="font-medium">{request.asset.type}</p>
                </div>
                {request.asset.assetTag && (
                  <div>
                    <label className="text-sm text-gray-500">Asset Tag</label>
                    <p className="font-mono">{request.asset.assetTag}</p>
                  </div>
                )}
                {request.asset.configuration && (
                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-500">Configuration</label>
                    <p className="font-medium">{request.asset.configuration}</p>
                  </div>
                )}
                {request.asset.location && (
                  <div>
                    <label className="text-sm text-gray-500">Location</label>
                    <p className="font-medium">{request.asset.location.name}</p>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Link href={`/employee/assets/${request.asset.id}`}>
                  <Button variant="outline" size="sm">View Asset</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.reason && (
                <div>
                  <label className="text-sm text-gray-500">Reason</label>
                  <p className="mt-1">{request.reason}</p>
                </div>
              )}
              {request.notes && (
                <div>
                  <label className="text-sm text-gray-500">Notes</label>
                  <p className="mt-1">{request.notes}</p>
                </div>
              )}
              {request.assignedByUser && (
                <div>
                  <label className="text-sm text-gray-500">Assigned By</label>
                  <p className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    {request.assignedByUser.name || request.assignedByUser.email}
                  </p>
                </div>
              )}
              {request.processedAt && request.processedByUser && (
                <>
                  <Separator />
                  <div>
                    <label className="text-sm text-gray-500">Processed By</label>
                    <p className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      {request.processedByUser.name || request.processedByUser.email}
                      <span className="text-gray-400">on {formatDateTime(request.processedAt)}</span>
                    </p>
                  </div>
                  {request.processorNotes && (
                    <div>
                      <label className="text-sm text-gray-500">Response Notes</label>
                      <p className="mt-1">{request.processorNotes}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* History */}
          {request.history && request.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.history.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex gap-4 ${index !== request.history.length - 1 ? 'pb-4 border-b' : ''}`}
                    >
                      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-gray-400"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{entry.action}</span>
                          {entry.newStatus && (
                            <AssetRequestStatusBadge status={entry.newStatus} />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          by {entry.performedBy.name || entry.performedBy.email} on {formatDateTime(entry.createdAt)}
                        </p>
                        {entry.notes && (
                          <p className="text-sm mt-2 text-gray-600">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
          />
        )}
      </div>
    </div>
  );
}
