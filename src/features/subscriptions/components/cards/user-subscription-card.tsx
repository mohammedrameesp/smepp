/**
 * @file user-subscription-card.tsx
 * @description Compact card showing subscription summary for employee/user views
 * @module components/domains/operations/subscriptions
 *
 * Features:
 * - Displays service name, billing cycle, and cost
 * - Shows next renewal date with urgency color coding
 * - Calculates and displays days until renewal
 * - Green left border for active status indicator
 * - Compact design suitable for dashboard widgets
 * - Currency-aware cost formatting (QAR vs $)
 *
 * Props:
 * @param subscription - Subscription object with details
 *
 * Usage:
 * ```tsx
 * <UserSubscriptionCard subscription={subscription} />
 * ```
 *
 * Display Format:
 * - Line 1: Service name (bold)
 * - Line 2: Billing cycle • Cost
 * - Line 3: Renewal date with "in X days" text
 *
 * Color Coding (Renewal):
 * - Red: Overdue (< 0 days)
 * - Orange: Due soon (≤ 7 days)
 * - Yellow: Upcoming (≤ 30 days)
 * - Gray: Normal (> 30 days)
 *
 * Use Cases:
 * - Employee dashboard subscription widgets
 * - "My Subscriptions" summary lists
 * - Quick overview panels
 */
'use client';

import { getNextRenewalDate, getDaysUntilRenewal, formatBillingCycle } from '../../utils';
import { formatDate } from '@/lib/date-format';

interface Subscription {
  id: string;
  serviceName: string;
  billingCycle: string;
  costPerCycle: number | null;
  costCurrency: string | null;
  renewalDate: Date | null;
}

interface UserSubscriptionCardProps {
  subscription: Subscription;
}

export function UserSubscriptionCard({ subscription }: UserSubscriptionCardProps) {
  const nextRenewal = subscription.renewalDate
    ? getNextRenewalDate(subscription.renewalDate, subscription.billingCycle)
    : null;
  const daysUntil = getDaysUntilRenewal(nextRenewal);

  let renewalColorClass = 'text-gray-500';
  if (daysUntil !== null) {
    if (daysUntil < 0) {
      renewalColorClass = 'text-red-600 font-medium';
    } else if (daysUntil <= 7) {
      renewalColorClass = 'text-orange-600 font-medium';
    } else if (daysUntil <= 30) {
      renewalColorClass = 'text-yellow-600';
    }
  }

  return (
    <div className="border-l-4 border-green-500 pl-4">
      <div className="font-medium">{subscription.serviceName}</div>
      <div className="text-sm text-gray-600">
        {formatBillingCycle(subscription.billingCycle)} • {subscription.costPerCycle ? (
          `${subscription.costCurrency === 'QAR' ? 'QAR' : '$'} ${subscription.costPerCycle.toFixed(2)}`
        ) : 'N/A'}
      </div>
      {nextRenewal && (
        <div className={`text-xs ${renewalColorClass}`}>
          Next renewal: {formatDate(nextRenewal)}
          {daysUntil !== null && (
            <span className="ml-1">
              {daysUntil < 0
                ? `(Overdue by ${Math.abs(daysUntil)} days)`
                : daysUntil === 0
                ? '(Due today)'
                : `(In ${daysUntil} days)`
              }
            </span>
          )}
        </div>
      )}
    </div>
  );
}
