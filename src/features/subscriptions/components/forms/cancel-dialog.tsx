/**
 * @file cancel-dialog.tsx
 * @description Modal dialog for cancelling active subscriptions
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - Custom cancellation date selection (defaults to today)
 * - Optional notes/reason field for audit trail
 * - Form validation and error handling
 * - Loading state during submission
 * - Confirmation workflow with clear action buttons
 *
 * Props:
 * @param open - Controls dialog visibility
 * @param onClose - Callback when dialog is closed
 * @param onConfirm - Async callback with (cancellationDate, notes?) parameters
 * @param subscriptionName - Name displayed in confirmation message
 *
 * Usage:
 * ```tsx
 * <CancelDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={async (date, notes) => {
 *     await api.cancelSubscription(id, date, notes);
 *   }}
 *   subscriptionName="Microsoft 365"
 * />
 * ```
 *
 * User Flow:
 * 1. User clicks cancel action on subscription
 * 2. Dialog opens with today's date pre-selected
 * 3. User can adjust cancellation date (past or future)
 * 4. User optionally adds cancellation reason
 * 5. User clicks confirm, API call is made
 * 6. Dialog closes and parent component refreshes data
 */
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { toInputDateString } from '@/lib/date-format';

interface CancelDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (cancellationDate: Date, notes?: string) => Promise<void>;
  subscriptionName: string;
}

export function CancelDialog({
  open,
  onClose,
  onConfirm,
  subscriptionName
}: CancelDialogProps) {
  const [notes, setNotes] = useState('');
  const [cancellationDate, setCancellationDate] = useState(toInputDateString(new Date()));
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(new Date(cancellationDate), notes || undefined);
      onClose();
      setNotes('');
      setCancellationDate(toInputDateString(new Date()));
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Subscription</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel <strong>{subscriptionName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="error">
            <AlertDescription>
              <strong>Warning:</strong> This will cancel the subscription.
              You can reactivate it later if needed, and all subscription data will be preserved.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="cancellationDate">Cancellation Date *</Label>
            <DatePicker
              id="cancellationDate"
              value={cancellationDate}
              onChange={(value) => setCancellationDate(value)}
              placeholder="Select cancellation date"
              required
            />
            <p className="text-xs text-gray-500">
              Select when the subscription was/will be cancelled. Can be in the past or future.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Cancellation Reason (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="E.g., No longer needed, switching to alternative service..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Keep Subscription
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} variant="destructive">
            {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
