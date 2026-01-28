/**
 * @file cancel-leave-dialog.tsx
 * @description Dialog component for cancelling leave requests with reason
 * @module components/domains/hr
 */
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
import { cancelLeaveRequest } from '@/features/leave/lib/api';
import { useSubmitAction } from '@/lib/hooks';
import { ICON_SIZES } from '@/lib/constants';
import type { CancelLeaveDialogProps } from '@/features/leave/types';

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
          <button className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-transparent text-slate-300 hover:text-white border border-slate-500 hover:border-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-slate-400">
            <Ban className={ICON_SIZES.sm} />
            Cancel Request
          </button>
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
