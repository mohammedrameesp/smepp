/**
 * @file user-subscription-history.tsx
 * @description Displays user's subscription history including active and inactive subscriptions with cost tracking
 * @module components/domains/system/users
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign } from 'lucide-react';
import { formatDate as formatDateUtil } from '@/lib/core/datetime';
import { formatCurrency } from '@/lib/core/currency';

interface ActivePeriod {
  startDate: Date;
  endDate: Date | null;
  renewalDate: Date;
  months: number;
  cost: number;
}

interface Subscription {
  id: string;
  serviceName: string;
  vendor: string | null;
  status: string;
  category: string | null;
  costPerCycle: any;
  costCurrency: string | null;
  billingCycle: string;
  activePeriods: ActivePeriod[];
  totalCost: number;
  totalMonths: number;
  currentPeriod?: ActivePeriod | null;
}

interface UserSubscriptionHistoryProps {
  subscriptions: Subscription[];
  viewMode?: 'admin' | 'employee';
}

export function UserSubscriptionHistory({ subscriptions, viewMode = 'admin' }: UserSubscriptionHistoryProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return formatDateUtil(date);
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
  const inactiveSubscriptions = subscriptions.filter(s => s.status !== 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Active Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Subscriptions ({activeSubscriptions.length})</CardTitle>
          <CardDescription>
            Subscriptions currently in use by this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSubscriptions.length > 0 ? (
            <div className="space-y-4">
              {activeSubscriptions.map((subscription) => (
                <div key={subscription.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{subscription.serviceName}</h3>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {subscription.vendor && <span>{subscription.vendor} • </span>}
                        {subscription.category}
                      </div>
                    </div>
                    <Link href={viewMode === 'admin' ? `/admin/subscriptions/${subscription.id}` : `/employee/subscriptions`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                  </div>

                  {/* Current Period Info */}
                  {subscription.currentPeriod && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-green-700 font-medium mb-1">Current Usage Period</div>
                          <div className="text-sm text-gray-700">
                            <Clock className="h-3 w-3 inline mr-1" />
                            Started: {formatDate(subscription.currentPeriod.startDate)}
                          </div>
                          <div className="text-sm text-gray-700">
                            Duration: {Math.round(subscription.currentPeriod.months * 10) / 10} months
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-green-700 font-medium mb-1">Cost This Period</div>
                          <div className="text-lg font-semibold text-green-900">
                            {formatCurrency(subscription.currentPeriod.cost, subscription.costCurrency || 'QAR')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Usage Summary */}
                  <div className="grid md:grid-cols-3 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-600">Total Active Time</div>
                      <div className="font-semibold">{Math.round(subscription.totalMonths * 10) / 10} months</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Active Periods</div>
                      <div className="font-semibold">{subscription.activePeriods.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Total Cost</div>
                      <div className="font-semibold">
                        {formatCurrency(subscription.totalCost, subscription.costCurrency || 'QAR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No active subscriptions assigned to this user
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive Subscriptions */}
      {inactiveSubscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inactive Subscriptions ({inactiveSubscriptions.length})</CardTitle>
            <CardDescription>
              Previously used subscriptions that are now paused or cancelled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactiveSubscriptions.map((subscription) => (
                <div key={subscription.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{subscription.serviceName}</h3>
                        {getStatusBadge(subscription.status)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {subscription.vendor && <span>{subscription.vendor} • </span>}
                        {subscription.category}
                      </div>
                    </div>
                    <Link href={viewMode === 'admin' ? `/admin/subscriptions/${subscription.id}` : `/employee/subscriptions`}>
                      <Button variant="outline" size="sm">View History</Button>
                    </Link>
                  </div>

                  {/* Usage Summary */}
                  <div className="grid md:grid-cols-3 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-600">Total Active Time</div>
                      <div className="font-semibold">{Math.round(subscription.totalMonths * 10) / 10} months</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Active Periods</div>
                      <div className="font-semibold">{subscription.activePeriods.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Total Cost</div>
                      <div className="font-semibold">
                        {formatCurrency(subscription.totalCost, subscription.costCurrency || 'QAR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
