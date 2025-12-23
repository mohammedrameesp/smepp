'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdjustBalanceDialogProps {
  balanceId: string;
  userName: string;
  leaveTypeName: string;
  currentBalance: number;
  onAdjusted?: () => void;
  trigger?: React.ReactNode;
}

export function AdjustBalanceDialog({
  balanceId,
  userName,
  leaveTypeName,
  currentBalance,
  onAdjusted,
  trigger,
}: AdjustBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [adjustment, setAdjustment] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdjust = async () => {
    const adjustmentValue = parseFloat(adjustment);

    if (isNaN(adjustmentValue) || adjustmentValue === 0) {
      setError('Please enter a valid adjustment amount');
      return;
    }

    if (!notes.trim()) {
      setError('Adjustment notes are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/leave/balances/${balanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment: adjustmentValue,
          adjustmentNotes: notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to adjust balance');
      }

      setOpen(false);
      setAdjustment('');
      setNotes('');
      toast.success('Balance adjusted successfully');
      onAdjusted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustmentValue = parseFloat(adjustment) || 0;
  const newBalance = currentBalance + adjustmentValue;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Adjust
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Leave Balance</DialogTitle>
          <DialogDescription>
            Adjust {leaveTypeName} balance for {userName}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg text-center">
            <div>
              <div className="text-sm text-gray-500">Current</div>
              <div className="text-xl font-bold">{currentBalance}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Adjustment</div>
              <div className={`text-xl font-bold ${adjustmentValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {adjustmentValue >= 0 ? '+' : ''}{adjustmentValue}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">New Balance</div>
              <div className="text-xl font-bold">{newBalance.toFixed(1)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustment">Adjustment (days)</Label>
            <Input
              id="adjustment"
              type="number"
              step="0.5"
              placeholder="e.g., 2 or -1.5"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Use positive numbers to add days, negative to deduct
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Adjustment Notes *</Label>
            <Textarea
              id="notes"
              placeholder="Explain the reason for this adjustment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdjust}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
