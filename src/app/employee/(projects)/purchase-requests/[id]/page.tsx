'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Clock, CheckCircle, XCircle, FileCheck, Trash2, Pencil, FileText, ShoppingCart } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/features/purchase-requests/components';
import { DetailCard } from '@/components/ui/detail-card';
import { InfoField, InfoFieldGrid } from '@/components/ui/info-field';
import { getStatusLabel, canDeleteRequest } from '@/features/purchase-requests/lib/purchase-request-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader, PageContent, PageHeaderButton } from '@/components/ui/page-header';

interface PurchaseRequestItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: number;
  unitPrice: string;
  currency: string;
  totalPrice: string;
  category: string | null;
  supplier: string | null;
  notes: string | null;
}

interface PurchaseRequestHistory {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  details: string | null;
  createdAt: string;
  performedBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface PurchaseRequest {
  id: string;
  referenceNumber: string;
  requestDate: string;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  justification: string | null;
  neededByDate: string | null;
  totalAmount: string;
  currency: string;
  totalAmountQAR: string | null;
  reviewNotes: string | null;
  completionNotes: string | null;
  reviewedAt: string | null;
  completedAt: string | null;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
  reviewedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  items: PurchaseRequestItem[];
  history: PurchaseRequestHistory[];
}

export default function EmployeePurchaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/purchase-requests/${resolvedParams.id}`);
      if (!response.ok) throw new Error('Failed to fetch purchase request');
      const data = await response.json();
      setRequest(data);
    } catch (error) {
      console.error('Error fetching purchase request:', error);
      setError('Failed to load purchase request');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleDelete = async () => {
    if (!request) return;
    setDeleting(true);

    try {
      const response = await fetch(`/api/purchase-requests/${request.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete request');
      }

      router.push('/employee/purchase-requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete request');
    } finally {
      setDeleting(false);
    }
  };

  // Format amount with currency
  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-QA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' ' + currency;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Format datetime
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <>
        <PageHeader
          title="Loading..."
          subtitle="Please wait while we load the purchase request"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'Purchase Requests', href: '/employee/purchase-requests' },
            { label: 'Details' }
          ]}
        />
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </PageContent>
      </>
    );
  }

  if (error && !request) {
    return (
      <>
        <PageHeader
          title="Error"
          subtitle="Failed to load purchase request"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'Purchase Requests', href: '/employee/purchase-requests' },
            { label: 'Details' }
          ]}
        />
        <PageContent>
          <div className="text-center bg-white rounded-2xl border border-slate-200 p-12">
            <p className="text-rose-600">{error}</p>
            <Button onClick={() => router.back()} variant="outline" className="mt-4">
              Go Back
            </Button>
          </div>
        </PageContent>
      </>
    );
  }

  if (!request) {
    return (
      <>
        <PageHeader
          title="Not Found"
          subtitle="Purchase request not found"
          breadcrumbs={[
            { label: 'Dashboard', href: '/employee' },
            { label: 'Purchase Requests', href: '/employee/purchase-requests' },
            { label: 'Details' }
          ]}
        />
        <PageContent>
          <div className="text-center bg-white rounded-2xl border border-slate-200 p-12">
            <p className="text-slate-600">Purchase request not found</p>
            <Button onClick={() => router.back()} variant="outline" className="mt-4">
              Go Back
            </Button>
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={request.referenceNumber}
        subtitle={request.title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Purchase Requests', href: '/employee/purchase-requests' },
          { label: 'Details' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canDeleteRequest(request.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <PageHeaderButton variant="destructive" disabled={deleting}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </PageHeaderButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Purchase Request</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this purchase request? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <PageHeaderButton href="/employee/purchase-requests" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back to Requests
            </PageHeaderButton>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <StatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
        </div>
      </PageHeader>

      <PageContent className="max-w-4xl">
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Request Details */}
          <DetailCard icon={FileText} iconColor="purple" title="Request Details" subtitle="Purchase request information">
            <div className="space-y-4">
              <InfoFieldGrid columns={2}>
                <InfoField label="Request Date" value={formatDate(request.requestDate)} />
                <InfoField label="Needed By" value={formatDate(request.neededByDate)} />
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Total Amount</p>
                  <p className="font-semibold text-emerald-700 text-lg">{formatAmount(request.totalAmount, request.currency)}</p>
                  {request.currency !== 'QAR' && request.totalAmountQAR && (
                    <p className="text-xs text-emerald-600 mt-1">≈ QAR {formatAmount(request.totalAmountQAR, 'QAR').replace(' QAR', '')}</p>
                  )}
                </div>
                <InfoField label="Items" value={request.items.length.toString()} />
              </InfoFieldGrid>

              {request.description && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Description</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{request.description}</p>
                </div>
              )}

              {request.justification && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Business Justification</p>
                  <p className="text-slate-700 whitespace-pre-wrap">{request.justification}</p>
                </div>
              )}
            </div>
          </DetailCard>

          {/* Review Notes (if reviewed) */}
          {request.reviewedBy && (
            <div className={`rounded-2xl border overflow-hidden ${
              request.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200' :
              request.status === 'REJECTED' ? 'bg-rose-50 border-rose-200' :
              'bg-white border-slate-200'
            }`}>
              <div className={`px-5 py-4 border-b flex items-center gap-3 ${
                request.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-100/50' :
                request.status === 'REJECTED' ? 'border-rose-200 bg-rose-100/50' :
                'border-slate-100'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  request.status === 'APPROVED' ? 'bg-emerald-200' :
                  request.status === 'REJECTED' ? 'bg-rose-200' :
                  'bg-blue-100'
                }`}>
                  {request.status === 'APPROVED' ? <CheckCircle className="h-5 w-5 text-emerald-700" /> :
                   request.status === 'REJECTED' ? <XCircle className="h-5 w-5 text-rose-700" /> :
                   <FileCheck className="h-5 w-5 text-blue-600" />}
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    request.status === 'APPROVED' ? 'text-emerald-900' :
                    request.status === 'REJECTED' ? 'text-rose-900' :
                    'text-slate-900'
                  }`}>
                    {request.status === 'APPROVED' ? 'Approval Information' :
                     request.status === 'REJECTED' ? 'Rejection Information' :
                     'Review Information'}
                  </h2>
                  <p className={`text-sm ${
                    request.status === 'APPROVED' ? 'text-emerald-700' :
                    request.status === 'REJECTED' ? 'text-rose-700' :
                    'text-slate-500'
                  }`}>
                    Review details and notes
                  </p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${
                    request.status === 'APPROVED' ? 'bg-emerald-100/50' :
                    request.status === 'REJECTED' ? 'bg-rose-100/50' :
                    'bg-slate-50'
                  }`}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reviewed By</p>
                    <p className="font-semibold text-slate-900">{request.reviewedBy.name || request.reviewedBy.email}</p>
                  </div>
                  {request.reviewedAt && (
                    <div className={`p-4 rounded-xl ${
                      request.status === 'APPROVED' ? 'bg-emerald-100/50' :
                      request.status === 'REJECTED' ? 'bg-rose-100/50' :
                      'bg-slate-50'
                    }`}>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reviewed At</p>
                      <p className="font-semibold text-slate-900">{formatDateTime(request.reviewedAt)}</p>
                    </div>
                  )}
                </div>
                {request.reviewNotes && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Notes</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{request.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line Items */}
          <DetailCard icon={ShoppingCart} iconColor="indigo" title={`Line Items (${request.items.length})`} subtitle="Requested items and pricing">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.itemNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-900">{item.description}</p>
                          {item.supplier && (
                            <p className="text-xs text-slate-500">Supplier: {item.supplier}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-slate-500">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{item.category || '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatAmount(item.unitPrice, item.currency)}</TableCell>
                      <TableCell className="text-right font-medium">{formatAmount(item.totalPrice, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DetailCard>

          {/* History */}
          <DetailCard icon={Clock} iconColor="blue" title="History" subtitle="Request activity timeline">
            <div className="space-y-4">
              {request.history.map((entry) => (
                <div key={entry.id} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    {entry.action === 'CREATED' && <Clock className="h-4 w-4 text-slate-500" />}
                    {entry.newStatus === 'APPROVED' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    {entry.newStatus === 'REJECTED' && <XCircle className="h-4 w-4 text-rose-500" />}
                    {entry.newStatus === 'COMPLETED' && <FileCheck className="h-4 w-4 text-slate-500" />}
                    {entry.action === 'STATUS_CHANGED' && !['APPROVED', 'REJECTED', 'COMPLETED'].includes(entry.newStatus || '') && (
                      <Clock className="h-4 w-4 text-blue-500" />
                    )}
                    {entry.action === 'UPDATED' && <Pencil className="h-4 w-4 text-slate-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm text-slate-900">
                          {entry.action === 'CREATED' && 'Request Created'}
                          {entry.action === 'STATUS_CHANGED' && `Status changed to ${getStatusLabel(entry.newStatus || '')}`}
                          {entry.action === 'UPDATED' && 'Request Updated'}
                        </p>
                        <p className="text-xs text-slate-500">
                          by {entry.performedBy.name || entry.performedBy.email}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400">{formatDateTime(entry.createdAt)}</p>
                    </div>
                    {entry.details && (
                      <p className="mt-1 text-sm text-slate-600">{entry.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DetailCard>
        </div>
      </PageContent>
    </>
  );
}
