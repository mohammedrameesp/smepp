/**
 * @file admin-request-actions.tsx
 * @description Admin actions component for approving or rejecting asset requests
 * @module components/domains/operations/asset-requests
 */
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
import { AlertCircle, CheckCircle, XCircle, Ban } from 'lucide-react';

interface AdminRequestActionsProps {
  requestId: string;
  type: string;
  status: string;
}

export function AdminRequestActions({ requestId, type, status }: AdminRequestActionsProps) {
  const router = useRouter();
  const [action, setAction] = useState<'approve' | 'reject' | 'revoke' | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if admin can process this request (approve/reject)
  const canProcess = (
    (type === 'EMPLOYEE_REQUEST' && status === 'PENDING_ADMIN_APPROVAL') ||
    (type === 'RETURN_REQUEST' && status === 'PENDING_RETURN_APPROVAL')
  );

  // Determine if admin can revoke this request (cancel pending user acceptance)
  const canRevoke = (
    type === 'ADMIN_ASSIGNMENT' && status === 'PENDING_USER_ACCEPTANCE'
  );

  if (!canProcess && !canRevoke) {
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
      let endpoint: string;
      let method: string;

      if (action === 'revoke') {
        // Cancel/revoke uses DELETE endpoint
        endpoint = `/api/asset-requests/${requestId}`;
        method = 'DELETE';
      } else {
        endpoint = action === 'approve'
          ? `/api/asset-requests/${requestId}/approve`
          : `/api/asset-requests/${requestId}/reject`;
        method = 'POST';
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: action !== 'revoke' ? JSON.stringify({ notes: notes.trim() || undefined }) : undefined,
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

  // Get dialog content based on action
  const getDialogContent = () => {
    switch (action) {
      case 'approve':
        return {
          title: `Approve ${actionLabel}`,
          description: `Are you sure you want to approve this ${actionLabel.toLowerCase()}?`,
          notesLabel: 'Notes (optional)',
          notesPlaceholder: 'Add any notes...',
          confirmLabel: 'Confirm Approval',
          confirmingLabel: 'Approving...',
        };
      case 'reject':
        return {
          title: `Reject ${actionLabel}`,
          description: `Please provide a reason for rejecting this ${actionLabel.toLowerCase()}.`,
          notesLabel: 'Reason for Rejection *',
          notesPlaceholder: 'Please explain why this request is being rejected...',
          confirmLabel: 'Confirm Rejection',
          confirmingLabel: 'Rejecting...',
        };
      case 'revoke':
        return {
          title: 'Revoke Assignment',
          description: 'This will cancel the pending assignment. The asset will become available for assignment again.',
          notesLabel: '',
          notesPlaceholder: '',
          confirmLabel: 'Revoke Assignment',
          confirmingLabel: 'Revoking...',
        };
      default:
        return null;
    }
  };

  const dialogContent = getDialogContent();

  return (
    <div className="flex items-center gap-3">
      {canProcess && (
        <>
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
        </>
      )}
      {canRevoke && (
        <Button
          variant="outline"
          onClick={() => setAction('revoke')}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <Ban className="h-4 w-4 mr-2" />
          Revoke Assignment
        </Button>
      )}

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{dialogContent?.title}</DialogTitle>
            <DialogDescription>{dialogContent?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {action !== 'revoke' && (
              <div className="space-y-2">
                <Label htmlFor="notes">{dialogContent?.notesLabel}</Label>
                <Textarea
                  id="notes"
                  placeholder={dialogContent?.notesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            )}

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
              variant={action === 'reject' || action === 'revoke' ? 'destructive' : 'default'}
              onClick={handleAction}
              disabled={isSubmitting}
            >
              {isSubmitting ? dialogContent?.confirmingLabel : dialogContent?.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
