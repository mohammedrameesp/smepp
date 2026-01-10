/**
 * @file subscription-renewal-display.tsx
 * @description Color-coded renewal status display with urgency badges
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - Calculates next renewal date based on billing cycle
 * - Shows days until renewal with color coding
 * - Urgency badges for overdue/upcoming renewals
 * - Status-aware display (hides for CANCELLED/PAUSED)
 * - Handles missing renewal dates gracefully
 *
 * Props:
 * @param renewalDate - Next renewal date
 * @param billingCycle - Billing frequency (MONTHLY, YEARLY, etc.)
 * @param status - Subscription status (optional)
 *
 * Usage:
 * ```tsx
 * <SubscriptionRenewalDisplay
 *   renewalDate={subscription.renewalDate}
 *   billingCycle="MONTHLY"
 *   status="ACTIVE"
 * />
 * ```
 *
 * Display Logic:
 * - No renewal date: Shows "Not specified"
 * - CANCELLED/PAUSED status: Shows "Not applicable"
 * - Active subscription: Shows formatted date with badge
 *
 * Color Coding:
 * - Red: Overdue (past renewal date)
 * - Orange: Due Soon (≤ 7 days)
 * - Yellow: Upcoming (≤ 30 days)
 * - Gray: Active (> 30 days)
 *
 * Badges:
 * - "Overdue": Red, destructive variant
 * - "Due Soon": Red/orange, destructive variant
 * - "Upcoming": Yellow background
 * - None: For dates > 30 days away
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { getNextRenewalDate, getDaysUntilRenewal } from '../../utils/renewal-date';
import { formatDate } from '@/lib/core/datetime';

interface SubscriptionRenewalDisplayProps {
  renewalDate: Date | null;
  billingCycle: string;
  status?: string;
}

export function SubscriptionRenewalDisplay({ renewalDate, billingCycle, status }: SubscriptionRenewalDisplayProps) {
  if (!renewalDate) {
    return <div>Not specified</div>;
  }

  // Don't show renewal information for cancelled or paused subscriptions
  if (status === 'CANCELLED' || status === 'PAUSED') {
    return <div className="text-gray-500">Not applicable ({status.toLowerCase()})</div>;
  }

  const nextRenewal = getNextRenewalDate(renewalDate, billingCycle);
  const daysUntil = getDaysUntilRenewal(nextRenewal);

  let colorClass = 'text-gray-900';
  let badge: React.ReactNode = null;

  if (daysUntil !== null) {
    if (daysUntil < 0) {
      colorClass = 'text-red-600';
      badge = <Badge variant="destructive">Overdue</Badge>;
    } else if (daysUntil <= 7) {
      colorClass = 'text-orange-600';
      badge = <Badge variant="destructive">Due Soon</Badge>;
    } else if (daysUntil <= 30) {
      colorClass = 'text-yellow-600';
      badge = <Badge className="bg-yellow-500">Upcoming</Badge>;
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={colorClass}>
          {formatDate(nextRenewal)}
        </span>
        {badge}
      </div>
      {daysUntil !== null && (
        <div className="text-sm text-gray-600 mt-1">
          {daysUntil < 0
            ? `Overdue by ${Math.abs(daysUntil)} days`
            : daysUntil === 0
            ? 'Due today'
            : `Due in ${daysUntil} days`
          }
        </div>
      )}
    </div>
  );
}
