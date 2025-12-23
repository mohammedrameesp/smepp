'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, XCircle } from 'lucide-react';
import { approveLeaveRequest, rejectLeaveRequest } from '@/lib/api/leave';
import { useSubmitAction } from '@/lib/hooks';
import type { LeaveApprovalActionsProps } from '@/lib/types/leave';

export function LeaveApprovalActions({ requestId, onApproved, onRejected }: LeaveApprovalActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const approveAction = useSubmitAction({
    action: async () => approveLeaveRequest(requestId, approveNotes || undefined),
    successMessage: 'Leave request approved',
    onSuccess: () => {
      setApproveOpen(false);
      setApproveNotes('');
      onApproved?.();
    },
    showToast: false,
  });

  const rejectAction = useSubmitAction({
    action: async () => {
      if (!rejectReason.trim()) {
        throw new Error('Rejection reason is required');
      }
      return rejectLeaveRequest(requestId, rejectReason);
    },
    successMessage: 'Leave request rejected',
    onSuccess: () => {
      setRejectOpen(false);
      setRejectReason('');
      onRejected?.();
    },
    showToast: false,
  });

  const handleApproveOpenChange = (isOpen: boolean) => {
    setApproveOpen(isOpen);
    if (!isOpen) {
      setApproveNotes('');
      approveAction.resetError();
    }
  };

  const handleRejectOpenChange = (isOpen: boolean) => {
    setRejectOpen(isOpen);
    if (!isOpen) {
      setRejectReason('');
      rejectAction.resetError();
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          onClick={() => setApproveOpen(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Approve
        </Button>
        <Button
          variant="destructive"
          onClick={() => setRejectOpen(true)}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={handleApproveOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this leave request?
            </DialogDescription>
          </DialogHeader>

          {approveAction.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {approveAction.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes for the employee..."
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={approveAction.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveAction.execute(undefined)}
              disabled={approveAction.isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveAction.isSubmitting ? 'Approving...' : 'Approve Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={handleRejectOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this leave request.
            </DialogDescription>
          </DialogHeader>

          {rejectAction.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {rejectAction.error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Rejection Reason *</label>
            <Textarea
              placeholder="Explain why the request is being rejected..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejectAction.isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectAction.execute(undefined)}
              disabled={rejectAction.isSubmitting}
            >
              {rejectAction.isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
