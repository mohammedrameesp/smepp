/**
 * @file subscription-lifecycle-actions.tsx
 * @description Action buttons for managing subscription lifecycle (cancel/reactivate)
 * @module components/domains/operations/subscriptions
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ReactivateDialog } from './reactivate-dialog';
import { CancelDialog } from './cancel-dialog';
import { SubscriptionStatus, BillingCycle } from '@prisma/client';
import { Play, Ban } from 'lucide-react';

interface SubscriptionLifecycleActionsProps {
  subscriptionId: string;
  subscriptionName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  renewalDate?: Date | null;
}

export function SubscriptionLifecycleActions({
  subscriptionId,
  subscriptionName,
  status,
  billingCycle,
  renewalDate
}: SubscriptionLifecycleActionsProps) {
  const router = useRouter();
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleReactivate = async (reactivationDate: Date, renewalDate: Date, notes?: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactivationDate: reactivationDate.toISOString(),
          renewalDate: renewalDate.toISOString(),
          notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reactivate subscription');
      }

      router.refresh();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate subscription', { duration: 10000 });
      throw error;
    }
  };

  const handleCancel = async (cancellationDate: Date, notes?: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationDate: cancellationDate.toISOString(),
          notes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel subscription');
      }

      router.refresh();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription', { duration: 10000 });
      throw error;
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {status === 'ACTIVE' && (
          <Button
            variant="outline"
            onClick={() => setCancelDialogOpen(true)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            <Ban className="h-4 w-4" />
            Cancel
          </Button>
        )}

        {status === 'CANCELLED' && (
          <Button
            variant="default"
            onClick={() => setReactivateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Reactivate
          </Button>
        )}
      </div>

      <ReactivateDialog
        open={reactivateDialogOpen}
        onClose={() => setReactivateDialogOpen(false)}
        onConfirm={handleReactivate}
        subscriptionName={subscriptionName}
        billingCycle={billingCycle}
      />

      <CancelDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancel}
        subscriptionName={subscriptionName}
      />
    </>
  );
}
