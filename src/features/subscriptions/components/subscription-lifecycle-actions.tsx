/**
 * @file subscription-lifecycle-actions.tsx
 * @description Action buttons for managing subscription lifecycle transitions
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - Cancel button for ACTIVE subscriptions
 * - Reactivate button for CANCELLED subscriptions
 * - Status-aware button rendering (only show relevant actions)
 * - Integrated dialog management for confirmation workflows
 * - API integration with error handling
 * - Success/error toast notifications
 * - Auto-refresh on successful actions
 *
 * Props:
 * @param subscriptionId - ID of the subscription
 * @param subscriptionName - Name displayed in confirmation dialogs
 * @param status - Current subscription status (determines which buttons show)
 * @param billingCycle - Used for renewal date calculations in reactivate dialog
 * @param renewalDate - Current renewal date (optional)
 *
 * Usage:
 * ```tsx
 * <SubscriptionLifecycleActions
 *   subscriptionId="sub_xyz123"
 *   subscriptionName="Microsoft 365"
 *   status="ACTIVE"
 *   billingCycle="MONTHLY"
 *   renewalDate={new Date()}
 * />
 * ```
 *
 * Rendered Actions:
 * - ACTIVE status: Shows "Cancel" button (red, destructive variant)
 * - CANCELLED status: Shows "Reactivate" button (green, with Play icon)
 * - EXPIRED/other: No actions shown
 *
 * User Flow:
 * 1. User clicks action button
 * 2. Appropriate dialog opens (CancelDialog or ReactivateDialog)
 * 3. User fills in details (dates, notes)
 * 4. API call is made on confirmation
 * 5. Success: Page refreshes, toast shows success
 * 6. Error: Toast shows error message, dialog stays open
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeaderButton } from '@/components/ui/page-header';
import { ReactivateDialog } from './forms/reactivate-dialog';
import { CancelDialog } from './forms/cancel-dialog';
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
      {status === 'ACTIVE' && (
        <PageHeaderButton
          variant="destructive"
          onClick={() => setCancelDialogOpen(true)}
        >
          <Ban className="h-4 w-4" />
          Cancel
        </PageHeaderButton>
      )}

      {status === 'CANCELLED' && (
        <PageHeaderButton
          variant="success"
          onClick={() => setReactivateDialogOpen(true)}
        >
          <Play className="h-4 w-4" />
          Reactivate
        </PageHeaderButton>
      )}

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
