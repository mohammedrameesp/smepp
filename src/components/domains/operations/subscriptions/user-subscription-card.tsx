/**
 * @file user-subscription-card.tsx
 * @description Card component displaying user subscription summary with renewal info
 * @module components/domains/operations/subscriptions
 */
'use client';

import { getNextRenewalDate, getDaysUntilRenewal } from '@/lib/utils/renewal-date';
import { formatDate } from '@/lib/date-format';
import { formatBillingCycle } from '@/lib/utils/format-billing-cycle';

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
