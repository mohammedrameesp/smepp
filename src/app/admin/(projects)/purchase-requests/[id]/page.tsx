'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Clock, FileCheck } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/purchase-requests/StatusBadge';
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
  // Additional fields
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
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-gray-600">Purchase request not found</p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const allowedTransitions = getAllowedStatusTransitions(request.status);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/admin/purchase-requests">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Purchase Requests
            </Button>
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {request.title}
              </h1>
              <p className="text-gray-600">{request.referenceNumber}</p>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Reference Number</p>
                    <p className="font-medium font-mono">{request.referenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Request Date</p>
                    <p className="font-medium">{formatDate(request.requestDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Requested By</p>
                    <p className="font-medium">{request.requester.name || request.requester.email}</p>
                    {request.requester.name && (
                      <p className="text-xs text-gray-500">{request.requester.email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Needed By</p>
                    <p className="font-medium">{formatDate(request.neededByDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-medium text-lg">{formatAmount(request.totalAmount, request.currency)}</p>
                    {request.currency !== 'QAR' && request.totalAmountQAR && (
                      <p className="text-xs text-gray-500">≈ QAR {formatAmount(request.totalAmountQAR, 'QAR').replace(' QAR', '')}</p>
                    )}
                  </div>
                </div>

                {request.description && (
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{request.description}</p>
                  </div>
                )}

                {request.justification && (
                  <div>
                    <p className="text-sm text-gray-500">Business Justification</p>
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap">{request.justification}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Type & Cost Details */}
            <Card>
              <CardHeader>
                <CardTitle>Purchase Type & Cost Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {request.purchaseType && (
                    <div>
                      <p className="text-sm text-gray-500">Purchase Type</p>
                      <p className="font-medium">{getPurchaseTypeLabel(request.purchaseType)}</p>
                    </div>
                  )}
                  {request.costType && (
                    <div>
                      <p className="text-sm text-gray-500">Cost Type</p>
                      <p className="font-medium">{getCostTypeLabel(request.costType)}</p>
                    </div>
                  )}
                  {request.projectName && (
                    <div>
                      <p className="text-sm text-gray-500">Project Name</p>
                      <p className="font-medium">{request.projectName}</p>
                    </div>
                  )}
                  {request.paymentMode && (
                    <div>
                      <p className="text-sm text-gray-500">Payment Mode</p>
                      <p className="font-medium">{getPaymentModeLabel(request.paymentMode)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vendor Details */}
            {(request.vendorName || request.vendorContact || request.vendorEmail) && (
              <Card>
                <CardHeader>
                  <CardTitle>Vendor Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {request.vendorName && (
                      <div>
                        <p className="text-sm text-gray-500">Vendor Name</p>
                        <p className="font-medium">{request.vendorName}</p>
                      </div>
                    )}
                    {request.vendorContact && (
                      <div>
                        <p className="text-sm text-gray-500">Contact Number</p>
                        <p className="font-medium">{request.vendorContact}</p>
                      </div>
                    )}
                    {request.vendorEmail && (
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{request.vendorEmail}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional Notes */}
            {request.additionalNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{request.additionalNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Line Items ({request.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
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
                              <p className="font-medium">{item.description}</p>
                              {item.supplier && (
                                <p className="text-xs text-gray-500">Supplier: {item.supplier}</p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-gray-500">{item.notes}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{item.category || '-'}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatAmount(item.unitPrice, item.currency)}</TableCell>
                          <TableCell className="text-right font-medium">{formatAmount(item.totalPrice, item.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.history.map((entry) => (
                    <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {entry.action === 'CREATED' && <Clock className="h-4 w-4 text-gray-500" />}
                        {entry.newStatus === 'APPROVED' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {entry.newStatus === 'REJECTED' && <XCircle className="h-4 w-4 text-red-500" />}
                        {entry.newStatus === 'COMPLETED' && <FileCheck className="h-4 w-4 text-gray-500" />}
                        {entry.action === 'STATUS_CHANGED' && !['APPROVED', 'REJECTED', 'COMPLETED'].includes(entry.newStatus || '') && (
                          <Clock className="h-4 w-4 text-blue-500" />
                        )}
                        {entry.action === 'UPDATED' && <Clock className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              {entry.action === 'CREATED' && 'Request Created'}
                              {entry.action === 'STATUS_CHANGED' && `Status changed to ${getStatusLabel(entry.newStatus || '')}`}
                              {entry.action === 'UPDATED' && 'Request Updated'}
                            </p>
                            <p className="text-xs text-gray-500">
                              by {entry.performedBy.name || entry.performedBy.email}
                            </p>
                          </div>
                          <p className="text-xs text-gray-400">{formatDateTime(entry.createdAt)}</p>
                        </div>
                        {entry.details && (
                          <p className="mt-1 text-sm text-gray-600">{entry.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Actions */}
          <div className="space-y-6">
            {/* Status Actions */}
            {allowedTransitions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Update the request status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Review Notes (Optional)</label>
                    <Textarea
                      placeholder="Add notes about this decision..."
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    {allowedTransitions.includes('APPROVED') && (
                      <Button
                        onClick={() => updateStatus('APPROVED')}
                        disabled={updating}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Approve Request
                      </Button>
                    )}

                    {allowedTransitions.includes('UNDER_REVIEW') && (
                      <Button
                        onClick={() => updateStatus('UNDER_REVIEW')}
                        disabled={updating}
                        variant="outline"
                        className="w-full"
                      >
                        {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                        Mark Under Review
                      </Button>
                    )}

                    {allowedTransitions.includes('COMPLETED') && (
                      <Button
                        onClick={() => updateStatus('COMPLETED')}
                        disabled={updating}
                        variant="outline"
                        className="w-full"
                      >
                        {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileCheck className="h-4 w-4 mr-2" />}
                        Mark as Completed
                      </Button>
                    )}

                    {allowedTransitions.includes('REJECTED') && (
                      <Button
                        onClick={() => updateStatus('REJECTED')}
                        disabled={updating}
                        variant="destructive"
                        className="w-full"
                      >
                        {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                        Reject Request
                      </Button>
                    )}

                    {allowedTransitions.includes('PENDING') && (
                      <Button
                        onClick={() => updateStatus('PENDING')}
                        disabled={updating}
                        variant="outline"
                        className="w-full"
                      >
                        {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Return to Pending
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Review Info */}
            {request.reviewedBy && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Review Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Reviewed By</p>
                    <p className="font-medium">{request.reviewedBy.name || request.reviewedBy.email}</p>
                  </div>
                  {request.reviewedAt && (
                    <div>
                      <p className="text-gray-500">Reviewed At</p>
                      <p className="font-medium">{formatDateTime(request.reviewedAt)}</p>
                    </div>
                  )}
                  {request.reviewNotes && (
                    <div>
                      <p className="text-gray-500">Notes</p>
                      <p className="text-gray-700">{request.reviewNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium">{request.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Currency</span>
                  <span className="font-medium">{request.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={request.status} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
