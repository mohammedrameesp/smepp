/**
 * @file reactivate-dialog.tsx
 * @description Dialog component for reactivating cancelled subscriptions
 * @module components/domains/operations/subscriptions
 */
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BillingCycle } from '@prisma/client';
import { getNextRenewalDate } from '../../lib/renewal-date';
import { DatePicker } from '@/components/ui/date-picker';
import { toInputDateString } from '@/lib/core/datetime';

interface ReactivateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reactivationDate: Date, renewalDate: Date, notes?: string) => Promise<void>;
  subscriptionName: string;
  billingCycle: BillingCycle;
}

export function ReactivateDialog({
  open,
  onClose,
  onConfirm,
  subscriptionName,
  billingCycle
}: ReactivateDialogProps) {
  const [reactivationDate, setReactivationDate] = useState(() => {
    const today = new Date();
    return toInputDateString(today);
  });
  const [renewalDate, setRenewalDate] = useState(() => {
    const today = new Date();
    const next = getNextRenewalDate(today, billingCycle);
    return toInputDateString(next || today);
  });
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-calculate renewal date when reactivation date changes
  const handleReactivationDateChange = (dateString: string) => {
    setReactivationDate(dateString);
    const date = new Date(dateString);
    const next = getNextRenewalDate(date, billingCycle);
    setRenewalDate(toInputDateString(next || date));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(new Date(reactivationDate), new Date(renewalDate), notes || undefined);
      onClose();
      setNotes('');
    } catch (error) {
      console.error('Error reactivating subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBillingCycleText = () => {
    switch (billingCycle) {
      case 'MONTHLY':
        return 'monthly';
      case 'YEARLY':
        return 'yearly';
      case 'ONE_TIME':
        return 'one-time';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reactivate Subscription</DialogTitle>
          <DialogDescription>
            Reactivate <strong>{subscriptionName}</strong> with a new renewal date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reactivationDate">Reactivation Date</Label>
            <DatePicker
              id="reactivationDate"
              value={reactivationDate}
              onChange={handleReactivationDateChange}
              required
            />
            <p className="text-sm text-gray-500">
              The actual date when the subscription was/will be reactivated.
              Defaults to today, but you can select a past or future date.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="renewalDate">Next Renewal Date</Label>
            <DatePicker
              id="renewalDate"
              value={renewalDate}
              onChange={setRenewalDate}
              required
            />
            <p className="text-sm text-gray-500">
              This subscription has a <strong>{getBillingCycleText()}</strong> billing cycle.
              Auto-calculated from reactivation date, but you can adjust it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this reactivation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Reactivating...' : 'Reactivate Subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
