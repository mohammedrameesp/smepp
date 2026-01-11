/**
 * @file supplier-actions.tsx
 * @description Action buttons component for supplier management (approve, reject, delete, add engagement)
 * @module components/domains/operations/suppliers
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Trash2,
  MessageSquare,
  Star,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';

interface SupplierActionsProps {
  supplierId: string;
  supplierName: string;
  supplierCategory: string;
  supplierCode: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export function SupplierActions({
  supplierId,
  supplierName,
  supplierCategory,
  supplierCode,
  status,
}: SupplierActionsProps) {
  const router = useRouter();

  // Dialog states
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{
    open: boolean;
    rejectionReason: string;
    isSubmitting: boolean;
  }>({
    open: false,
    rejectionReason: '',
    isSubmitting: false,
  });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [engagementDialog, setEngagementDialog] = useState({
    open: false,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    rating: null as number | null,
    isSubmitting: false,
  });

  const handleApproveConfirm = async () => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/approve`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve supplier');
      }

      setApproveDialog(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve supplier', { duration: 10000 });
      setApproveDialog(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectDialog.rejectionReason.trim()) {
      toast.error('Please provide a rejection reason', { duration: 10000 });
      return;
    }

    setRejectDialog(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectDialog.rejectionReason }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If supplier not found, it was already rejected/deleted - just redirect
        if (response.status === 404) {
          router.push('/admin/suppliers');
          return;
        }
        throw new Error(data.error || 'Failed to reject supplier');
      }

      toast.success('Supplier rejected and removed');
      setRejectDialog({ open: false, rejectionReason: '', isSubmitting: false });
      router.push('/admin/suppliers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject supplier', { duration: 10000 });
      setRejectDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete supplier');
      }

      setDeleteDialog(false);
      router.push('/admin/suppliers');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete supplier', { duration: 10000 });
      setDeleteDialog(false);
    }
  };

  const handleAddEngagement = async () => {
    if (!engagementDialog.notes.trim()) {
      toast.error('Please enter notes for the engagement', { duration: 10000 });
      return;
    }

    setEngagementDialog(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await fetch(`/api/suppliers/${supplierId}/engagements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: engagementDialog.date,
          notes: engagementDialog.notes,
          rating: engagementDialog.rating,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add engagement');
      }

      setEngagementDialog({
        open: false,
        date: new Date().toISOString().split('T')[0],
        notes: '',
        rating: null,
        isSubmitting: false,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add engagement', { duration: 10000 });
      setEngagementDialog(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {status === 'PENDING' && (
          <>
            <Button
              onClick={() => setApproveDialog(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => setRejectDialog({ open: true, rejectionReason: '', isSubmitting: false })}
              variant="destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </>
        )}
        {status === 'APPROVED' && (
          <Button onClick={() => setEngagementDialog({ ...engagementDialog, open: true })}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Add Engagement
          </Button>
        )}
        <Link href={`/admin/suppliers/${supplierId}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
        <Button
          onClick={() => setDeleteDialog(true)}
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Approval Dialog */}
      <Dialog open={approveDialog} onOpenChange={setApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this supplier? A supplier code will be automatically assigned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Supplier:</strong> {supplierName}
              </p>
              <p className="text-sm text-blue-800 mt-1">
                <strong>Category:</strong> {supplierCategory}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => !rejectDialog.isSubmitting && setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Supplier</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this supplier registration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={rejectDialog.rejectionReason}
                onChange={(e) =>
                  setRejectDialog({ ...rejectDialog, rejectionReason: e.target.value })
                }
                placeholder="Enter the reason for rejection..."
                rows={4}
                required
                disabled={rejectDialog.isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, rejectionReason: '', isSubmitting: false })}
              disabled={rejectDialog.isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={rejectDialog.isSubmitting}>
              {rejectDialog.isSubmitting ? 'Rejecting...' : 'Reject Supplier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the supplier and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">
                <strong>Supplier:</strong> {supplierName}
              </p>
              <p className="text-sm text-red-800 mt-1">
                <strong>Code:</strong> {supplierCode || 'Not assigned'}
              </p>
              <p className="text-sm text-red-800 mt-1">
                <strong>Status:</strong> {status}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this supplier? All engagement history will also be removed.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Engagement Dialog */}
      <Dialog open={engagementDialog.open} onOpenChange={(open) => setEngagementDialog({ ...engagementDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Engagement</DialogTitle>
            <DialogDescription>
              Record a new engagement or interaction with this supplier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="engagementDate">Date *</Label>
              <input
                id="engagementDate"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={engagementDialog.date}
                onChange={(e) => setEngagementDialog({ ...engagementDialog, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rating">Rating (Optional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEngagementDialog({
                      ...engagementDialog,
                      rating: engagementDialog.rating === star ? null : star
                    })}
                    className="focus:outline-none transition-colors"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        engagementDialog.rating && star <= engagementDialog.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {engagementDialog.rating && (
                  <span className="ml-2 text-sm text-gray-600">
                    {engagementDialog.rating} star{engagementDialog.rating !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="engagementNotes">Notes *</Label>
              <Textarea
                id="engagementNotes"
                value={engagementDialog.notes}
                onChange={(e) => setEngagementDialog({ ...engagementDialog, notes: e.target.value })}
                placeholder="Describe the engagement..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEngagementDialog({ ...engagementDialog, open: false })}
              disabled={engagementDialog.isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleAddEngagement} disabled={engagementDialog.isSubmitting}>
              {engagementDialog.isSubmitting ? 'Adding...' : 'Add Engagement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
