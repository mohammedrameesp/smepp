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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Ban } from 'lucide-react';
import { cancelLeaveRequest } from '@/lib/api/leave';
import { useSubmitAction } from '@/lib/hooks';
import type { CancelLeaveDialogProps } from '@/lib/types/leave';

interface Props extends CancelLeaveDialogProps {
  trigger?: React.ReactNode;
}

export function CancelLeaveDialog({ requestId, requestNumber, onCancelled, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const { isSubmitting, error, execute, resetError } = useSubmitAction({
    action: async () => {
      if (!reason.trim()) {
        throw new Error('Cancellation reason is required');
      }
      return cancelLeaveRequest(requestId, reason);
    },
    successMessage: 'Leave request cancelled',
    onSuccess: () => {
      setOpen(false);
      setReason('');
      onCancelled?.();
    },
    showToast: false, // We'll show error inline
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setReason('');
      resetError();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Ban className="h-4 w-4 mr-2" />
            Cancel Request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Leave Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel leave request {requestNumber}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Cancellation Reason *</label>
          <Textarea
            placeholder="Please provide a reason for cancellation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Keep Request
          </Button>
          <Button
            variant="destructive"
            onClick={() => execute(undefined)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Cancelling...' : 'Cancel Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
