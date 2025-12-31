'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Loader2, Clock, CheckCircle, XCircle, FileCheck, Trash2, Pencil } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/purchase-requests';
import { getStatusLabel, canDeleteRequest, canEditRequest } from '@/lib/purchase-request-utils';
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/employee/purchase-requests">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Requests
            </Button>
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {request.referenceNumber}
              </h1>
              <p className="text-gray-600">{request.title}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <StatusBadge status={request.status} />
                <PriorityBadge priority={request.priority} />
              </div>
              {canDeleteRequest(request.status) && (
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={deleting}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
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
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Request Date</p>
                  <p className="font-medium">{formatDate(request.requestDate)}</p>
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
                <div>
                  <p className="text-sm text-gray-500">Items</p>
                  <p className="font-medium">{request.items.length}</p>
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

          {/* Review Notes (if reviewed) */}
          {request.reviewedBy && (
            <Card className={
              request.status === 'APPROVED' ? 'border-green-200 bg-green-50' :
              request.status === 'REJECTED' ? 'border-red-200 bg-red-50' :
              ''
            }>
              <CardHeader>
                <CardTitle className="text-sm">
                  {request.status === 'APPROVED' ? 'Approval Information' :
                   request.status === 'REJECTED' ? 'Rejection Information' :
                   'Review Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                {request.reviewNotes && (
                  <div>
                    <p className="text-gray-500">Notes</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{request.reviewNotes}</p>
                  </div>
                )}
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
                      {entry.action === 'UPDATED' && <Pencil className="h-4 w-4 text-gray-500" />}
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
      </div>
    </div>
  );
}
