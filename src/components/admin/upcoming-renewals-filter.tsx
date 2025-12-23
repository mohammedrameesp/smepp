'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { formatDate } from '@/lib/date-format';

type TimeFilter = 'this_week' | 'this_month' | 'next_month' | 'next_30_days' | 'next_60_days' | 'next_90_days';

interface Subscription {
  id: string;
  serviceName: string;
  costPerCycle: any;
  costCurrency: string | null;
  paymentMethod: string | null;
  status: string;
  assignedUser: {
    name: string | null;
    email: string;
  } | null;
  nextRenewalDate: Date | null;
  daysUntilRenewal: number | null;
}

interface Props {
  subscriptions: Subscription[];
}

export function UpcomingRenewalsFilter({ subscriptions }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('next_30_days');

  const filteredSubscriptions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return subscriptions.filter(sub => {
      // Filter out cancelled and paused subscriptions
      if (sub.status === 'CANCELLED' || sub.status === 'PAUSED') return false;

      if (sub.daysUntilRenewal === null) return false;

      const days = sub.daysUntilRenewal;

      switch (timeFilter) {
        case 'this_week':
          // Next 7 days
          return days >= 0 && days <= 7;
        case 'this_month':
          // Rest of current month
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const daysUntilEndOfMonth = Math.ceil((endOfMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return days >= 0 && days <= daysUntilEndOfMonth;
        case 'next_month':
          // Next calendar month
          const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          const daysUntilStartNext = Math.ceil((startOfNextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const daysUntilEndNext = Math.ceil((endOfNextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return days >= daysUntilStartNext && days <= daysUntilEndNext;
        case 'next_30_days':
          return days >= 0 && days <= 30;
        case 'next_60_days':
          return days >= 0 && days <= 60;
        case 'next_90_days':
          return days >= 0 && days <= 90;
        default:
          return days >= 0 && days <= 30;
      }
    }).sort((a, b) => {
      if (a.daysUntilRenewal === null) return 1;
      if (b.daysUntilRenewal === null) return -1;
      return a.daysUntilRenewal - b.daysUntilRenewal;
    });
  }, [subscriptions, timeFilter]);

  const getFilterLabel = () => {
    switch (timeFilter) {
      case 'this_week':
        return 'This Week';
      case 'this_month':
        return 'This Month';
      case 'next_month':
        return 'Next Month';
      case 'next_30_days':
        return 'Next 30 Days';
      case 'next_60_days':
        return 'Next 60 Days';
      case 'next_90_days':
        return 'Next 90 Days';
      default:
        return 'Next 30 Days';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Renewals</CardTitle>
            <CardDescription>
              Subscriptions requiring renewal attention
            </CardDescription>
          </div>
          <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value as TimeFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="next_month">Next Month</SelectItem>
              <SelectItem value="next_30_days">Next 30 Days</SelectItem>
              <SelectItem value="next_60_days">Next 60 Days</SelectItem>
              <SelectItem value="next_90_days">Next 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSubscriptions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Renewal Date</TableHead>
                <TableHead>Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((sub) => {
                const daysUntil = sub.daysUntilRenewal;
                let urgencyColor = 'text-gray-900';
                let urgencyBadge = null;

                if (daysUntil !== null) {
                  if (daysUntil <= 7) {
                    urgencyColor = 'text-red-600 font-semibold';
                    urgencyBadge = <Badge variant="destructive" className="ml-2">Due Soon!</Badge>;
                  } else if (daysUntil <= 14) {
                    urgencyColor = 'text-orange-600 font-medium';
                    urgencyBadge = <Badge className="ml-2 bg-orange-500">Upcoming</Badge>;
                  } else if (daysUntil <= 21) {
                    urgencyColor = 'text-yellow-600';
                  }
                }

                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/subscriptions/${sub.id}`} className="hover:underline text-gray-700 hover:text-gray-900">
                        {sub.serviceName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {sub.assignedUser?.name || sub.assignedUser?.email || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {sub.paymentMethod ? (
                        <div className="flex items-center gap-1">
                          <span>💳</span>
                          <span className="text-sm">•••• {sub.paymentMethod.slice(-4)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className={urgencyColor}>
                          {formatDate(sub.nextRenewalDate)}
                        </span>
                        {urgencyBadge}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {daysUntil === 0 ? 'Due today!' : daysUntil === 1 ? 'Due tomorrow' : `In ${daysUntil} days`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {sub.costPerCycle ? (
                        `${sub.costCurrency === 'QAR' ? 'QAR' : '$'} ${Number(sub.costPerCycle).toFixed(2)}`
                      ) : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-gray-500 text-center py-4">No upcoming renewals for {getFilterLabel().toLowerCase()}</p>
        )}
      </CardContent>
    </Card>
  );
}
