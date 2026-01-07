/**
 * @file subscription-actions.tsx
 * @description Simple action button component for subscription table rows
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - View button linking to subscription detail page
 * - Consistent styling with outline variant
 * - Small size for table row display
 *
 * Props:
 * @param subscriptionId - ID of the subscription to view
 *
 * Usage:
 * ```tsx
 * <SubscriptionActions subscriptionId="sub_xyz123" />
 * ```
 *
 * Note: For more complex actions (cancel, reactivate), use SubscriptionLifecycleActions instead.
 */
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SubscriptionActionsProps {
  subscriptionId: string;
}

export function SubscriptionActions({ subscriptionId }: SubscriptionActionsProps) {
  return (
    <Link href={`/admin/subscriptions/${subscriptionId}`}>
      <Button variant="outline" size="sm">
        View
      </Button>
    </Link>
  );
}
