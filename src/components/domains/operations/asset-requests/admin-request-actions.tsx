'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface AdminRequestActionsProps {
  requestId: string;
  type: string;
  status: string;
}

export function AdminRequestActions({ requestId, type, status }: AdminRequestActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if admin can process this request
  const canProcess = (
    (type === 'EMPLOYEE_REQUEST' && status === 'PENDING_ADMIN_APPROVAL') ||
    (type === 'RETURN_REQUEST' && status === 'PENDING_RETURN_APPROVAL')
  );

  if (!canProcess) {
    return null;
  }

  const handleAction = async () => {
    if (action === 'reject' && !notes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = action === 'approve'
        ? `/api/asset-requests/${requestId}/approve`
        : `/api/asset-requests/${requestId}/reject`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} request`);
      }

      setAction(null);
      setNotes('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionLabel = type === 'RETURN_REQUEST' ? 'Return' : 'Request';

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={() => setAction('reject')}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <XCircle className="h-4 w-4 mr-2" />
        Reject
      </Button>
      <Button onClick={() => setAction('approve')}>
        <CheckCircle className="h-4 w-4 mr-2" />
        Approve {actionLabel}
      </Button>

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve' : 'Reject'} {actionLabel}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? `Are you sure you want to approve this ${actionLabel.toLowerCase()}?`
                : `Please provide a reason for rejecting this ${actionLabel.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                {action === 'approve' ? 'Notes (optional)' : 'Reason for Rejection *'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  action === 'approve'
                    ? 'Add any notes...'
                    : 'Please explain why this request is being rejected...'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAction(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={action === 'reject' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? `${action === 'approve' ? 'Approving' : 'Rejecting'}...`
                : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
