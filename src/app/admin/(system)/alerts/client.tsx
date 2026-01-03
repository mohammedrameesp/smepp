'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Alert } from './page';

interface AlertsClientProps {
  alerts: Alert[];
  counts: {
    total: number;
    birthdays: number;
    anniversaries: number;
    employeeDocuments: number;
    companyDocuments: number;
    subscriptions: number;
    expired: number;
  };
}

type AlertCategory = 'all' | 'celebrations' | 'documents' | 'subscriptions';
type DateRange = 'all' | 'week' | 'month';

const ALERT_ICONS: Record<Alert['type'], string> = {
  birthday: '🎂',
  anniversary: '🎉',
  employee_document: '🪪',
  company_document: '📄',
  subscription: '🔄',
};

const ALERT_COLORS: Record<Alert['type'], string> = {
  birthday: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  anniversary: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
  employee_document: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  company_document: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
  subscription: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
};

const STATUS_BADGES: Record<Alert['status'], { className: string; label: string }> = {
  today: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Today' },
  upcoming: { className: 'bg-slate-100 text-slate-700 border-slate-300', label: '' },
  expiring: { className: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Expiring soon' },
  expired: { className: 'bg-rose-100 text-rose-800 border-rose-300', label: 'Expired' },
};

export function AlertsClient({ alerts, counts }: AlertsClientProps) {
  const [category, setCategory] = useState<AlertCategory>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Category filter
    if (category === 'celebrations') {
      filtered = filtered.filter((a) => a.type === 'birthday' || a.type === 'anniversary');
    } else if (category === 'documents') {
      filtered = filtered.filter((a) => a.type === 'employee_document' || a.type === 'company_document');
    } else if (category === 'subscriptions') {
      filtered = filtered.filter((a) => a.type === 'subscription');
    }

    // Date range filter
    if (dateRange === 'week') {
      filtered = filtered.filter((a) => a.daysUntil <= 7);
    } else if (dateRange === 'month') {
      filtered = filtered.filter((a) => a.daysUntil <= 30);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((a) => a.title.toLowerCase().includes(term));
    }

    return filtered;
  }, [alerts, category, dateRange, searchTerm]);

  const formatDaysUntil = (days: number): string => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 0) return `${Math.abs(days)}d ago`;
    return `${days}d`;
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="font-semibold text-slate-900 text-lg mb-1">All clear!</h3>
        <p className="text-slate-500 mb-4">No upcoming alerts in the next 30 days.</p>
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as AlertCategory)}>
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
          <TabsTrigger value="celebrations">
            Celebrations ({counts.birthdays + counts.anniversaries})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({counts.employeeDocuments + counts.companyDocuments})
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            Subscriptions ({counts.subscriptions})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All (Next 30 days)</SelectItem>
                <SelectItem value="week">This Week (7 days)</SelectItem>
                <SelectItem value="month">This Month (30 days)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-slate-500">
        Showing {filteredAlerts.length} of {alerts.length} alerts
      </p>

      {/* Alert Cards */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <p className="text-slate-500">No alerts match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredAlerts.map((alert) => (
            <Link
              key={alert.id}
              href={alert.entityLink}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${ALERT_COLORS[alert.type]}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{ALERT_ICONS[alert.type]}</span>
                <div>
                  <p className="font-medium text-gray-900">{alert.title}</p>
                  {alert.subtitle && (
                    <p className="text-sm text-gray-600">{alert.subtitle}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {alert.status !== 'upcoming' && (
                  <Badge variant="outline" className={STATUS_BADGES[alert.status].className}>
                    {STATUS_BADGES[alert.status].label}
                  </Badge>
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(alert.date), 'MMM d, yyyy')}
                  </p>
                  <p className={`text-xs ${alert.daysUntil < 0 ? 'text-rose-600' : alert.daysUntil === 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                    {formatDaysUntil(alert.daysUntil)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
