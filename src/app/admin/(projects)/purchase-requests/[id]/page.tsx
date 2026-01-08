'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, FileCheck, ShoppingCart, DollarSign, User, Calendar, Building2, FileText, AlertCircle } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/features/purchase-requests/components';
import { getAllowedStatusTransitions, getStatusLabel, getPurchaseTypeLabel, getCostTypeLabel, getPaymentModeLabel } from '@/lib/purchase-request-utils';

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
  purchaseType: string | null;
  costType: string | null;
  projectName: string | null;
  paymentMode: string | null;
  vendorName: string | null;
  vendorContact: string | null;
  vendorEmail: string | null;
  additionalNotes: string | null;
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

export default function AdminPurchaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequest();
  }, [resolvedParams.id]);

  const fetchRequest = async () => {
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
  };

  const updateStatus = async (newStatus: string) => {
    if (!request) return;
    setUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/purchase-requests/${request.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          reviewNotes: reviewNotes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      await fetchRequest();
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const formatAmount = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-QA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num) + ' ' + currency;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

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
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-64 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <h3 className="font-semibold text-slate-900 text-lg mb-1">{error}</h3>
          <p className="text-slate-500 mb-4">We couldn&apos;t load this purchase request.</p>
          <Button onClick={() => router.back()} variant="outline">Go Back</Button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-900 text-lg mb-1">Purchase request not found</h3>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const allowedTransitions = getAllowedStatusTransitions(request.status);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/purchase-requests"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Purchase Requests
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <p className="text-slate-500 font-mono">{request.referenceNumber}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Request Details</h2>
                <p className="text-sm text-slate-500">General information</p>
              </div>
            </div>
            <div className="p-5">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reference</p>
                  <p className="font-mono font-semibold text-slate-900">{request.referenceNumber}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Request Date</p>
                  <p className="font-semibold text-slate-900">{formatDate(request.requestDate)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Needed By</p>
                  <p className="font-semibold text-slate-900">{formatDate(request.neededByDate)}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Total Amount</p>
                  <p className="font-bold text-lg text-emerald-700">{formatAmount(request.totalAmount, request.currency)}</p>
                  {request.currency !== 'QAR' && request.totalAmountQAR && (
                    <p className="text-xs text-emerald-600">≈ QAR {formatAmount(request.totalAmountQAR, 'QAR').replace(' QAR', '')}</p>
                  )}
                </div>
              </div>

              {request.description && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Description</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-700">{request.description}</div>
                </div>
              )}

              {request.justification && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Business Justification</p>
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-700">{request.justification}</div>
                </div>
              )}
            </div>
          </div>

          {/* Purchase & Cost Type */}
          {(request.purchaseType || request.costType || request.projectName || request.paymentMode) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Purchase & Cost Details</h2>
              </div>
              <div className="p-5 grid sm:grid-cols-2 gap-4">
                {request.purchaseType && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Purchase Type</p>
                    <p className="font-semibold text-slate-900">{getPurchaseTypeLabel(request.purchaseType)}</p>
                  </div>
                )}
                {request.costType && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cost Type</p>
                    <p className="font-semibold text-slate-900">{getCostTypeLabel(request.costType)}</p>
                  </div>
                )}
                {request.projectName && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Project</p>
                    <p className="font-semibold text-slate-900">{request.projectName}</p>
                  </div>
                )}
                {request.paymentMode && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Payment Mode</p>
                    <p className="font-semibold text-slate-900">{getPaymentModeLabel(request.paymentMode)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vendor Details */}
          {(request.vendorName || request.vendorContact || request.vendorEmail) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-amber-600" />
                </div>
                <h2 className="font-semibold text-slate-900">Vendor Details</h2>
              </div>
              <div className="p-5 grid sm:grid-cols-3 gap-4">
                {request.vendorName && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</p>
                    <p className="font-semibold text-slate-900">{request.vendorName}</p>
                  </div>
                )}
                {request.vendorContact && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Contact</p>
                    <p className="font-semibold text-slate-900">{request.vendorContact}</p>
                  </div>
                )}
                {request.vendorEmail && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</p>
                    <p className="font-semibold text-slate-900">{request.vendorEmail}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Line Items</h2>
                <p className="text-sm text-slate-500">{request.items.length} item(s)</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
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
                      <TableCell className="font-mono text-sm text-slate-500">{item.itemNumber}</TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        {item.supplier && (
                          <p className="text-xs text-slate-500">Supplier: {item.supplier}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{item.category || '-'}</TableCell>
                      <TableCell className="text-right text-slate-900">{item.quantity}</TableCell>
                      <TableCell className="text-right text-slate-900">{formatAmount(item.unitPrice, item.currency)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">{formatAmount(item.totalPrice, item.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="font-semibold text-slate-900">History</h2>
            </div>
            <div className="p-5 space-y-4">
              {request.history.map((entry) => (
                <div key={entry.id} className="flex gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    {entry.action === 'CREATED' && <Clock className="h-4 w-4 text-slate-500" />}
                    {entry.newStatus === 'APPROVED' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    {entry.newStatus === 'REJECTED' && <XCircle className="h-4 w-4 text-rose-500" />}
                    {entry.newStatus === 'COMPLETED' && <FileCheck className="h-4 w-4 text-purple-500" />}
                    {entry.action === 'STATUS_CHANGED' && !['APPROVED', 'REJECTED', 'COMPLETED'].includes(entry.newStatus || '') && (
                      <Clock className="h-4 w-4 text-blue-500" />
                    )}
                    {entry.action === 'UPDATED' && <Clock className="h-4 w-4 text-slate-500" />}
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
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {allowedTransitions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Actions</h2>
                <p className="text-sm text-slate-500">Update request status</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Review Notes</label>
                  <Textarea
                    placeholder="Add notes about this decision..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  {allowedTransitions.includes('APPROVED') && (
                    <Button
                      onClick={() => updateStatus('APPROVED')}
                      disabled={updating}
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve Request
                    </Button>
                  )}

                  {allowedTransitions.includes('UNDER_REVIEW') && (
                    <Button onClick={() => updateStatus('UNDER_REVIEW')} disabled={updating} variant="outline" className="w-full">
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                      Mark Under Review
                    </Button>
                  )}

                  {allowedTransitions.includes('COMPLETED') && (
                    <Button onClick={() => updateStatus('COMPLETED')} disabled={updating} variant="outline" className="w-full">
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
                      Mark as Completed
                    </Button>
                  )}

                  {allowedTransitions.includes('REJECTED') && (
                    <Button onClick={() => updateStatus('REJECTED')} disabled={updating} variant="destructive" className="w-full">
                      {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Reject Request
                    </Button>
                  )}

                  {allowedTransitions.includes('PENDING') && (
                    <Button onClick={() => updateStatus('PENDING')} disabled={updating} variant="outline" className="w-full">
                      {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Return to Pending
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Requester */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                <User className="h-5 w-5 text-rose-600" />
              </div>
              <h2 className="font-semibold text-slate-900">Requester</h2>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                  <span className="text-rose-600 font-semibold">
                    {request.requester.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{request.requester.name || 'Unknown'}</p>
                  <p className="text-sm text-slate-500">{request.requester.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Review Info */}
          {request.reviewedBy && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Review Information</h2>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reviewed By</p>
                  <p className="font-semibold text-slate-900">{request.reviewedBy.name || request.reviewedBy.email}</p>
                </div>
                {request.reviewedAt && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Reviewed At</p>
                    <p className="font-semibold text-slate-900">{formatDateTime(request.reviewedAt)}</p>
                  </div>
                )}
                {request.reviewNotes && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-slate-700 text-sm">{request.reviewNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Quick Info</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Items</span>
                <span className="font-semibold text-slate-900">{request.items.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Currency</span>
                <span className="font-semibold text-slate-900">{request.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <StatusBadge status={request.status} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
