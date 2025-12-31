/**
 * @file depreciation-schedule-table.tsx
 * @description Table component showing projected and recorded depreciation schedule
 * @module components/domains/operations/assets
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronDown, ChevronUp, Loader2, AlertCircle } from 'lucide-react';

interface ScheduleItem {
  periodStart: string;
  periodEnd: string;
  monthlyAmount: number;
  newAccumulatedAmount: number;
  newNetBookValue: number;
  isFullyDepreciated: boolean;
  proRataFactor: number;
  status: 'recorded' | 'projected';
}

interface DepreciationSummary {
  acquisitionCost: number;
  salvageValue: number;
  depreciableAmount: number;
  usefulLifeMonths: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  remainingMonths: number;
  percentDepreciated: number;
  isFullyDepreciated: boolean;
}

interface DepreciationScheduleTableProps {
  assetId: string;
  showTitle?: boolean;
  initialCollapsed?: boolean;
}

export function DepreciationScheduleTable({
  assetId,
  showTitle = true,
  initialCollapsed = true,
}: DepreciationScheduleTableProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [summary, setSummary] = useState<DepreciationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [visibleCount, setVisibleCount] = useState(12);

  const fetchSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/assets/${assetId}/depreciation/schedule`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch depreciation schedule');
      }

      const data = await response.json();
      setSchedule(data.schedule || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Error fetching depreciation schedule:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-QA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Depreciation Schedule
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading schedule...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {showTitle && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Depreciation Schedule
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center gap-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (schedule.length === 0) {
    return null;
  }

  const visibleSchedule = schedule.slice(0, visibleCount);
  const hasMore = schedule.length > visibleCount;
  const recordedCount = schedule.filter((s) => s.status === 'recorded').length;
  const projectedCount = schedule.filter((s) => s.status === 'projected').length;

  return (
    <Card>
      {showTitle && (
        <CardHeader className="cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Depreciation Schedule
              </CardTitle>
              <CardDescription>
                {recordedCount} recorded, {projectedCount} projected periods
                {summary && ` | ${summary.remainingMonths} months remaining`}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </CardHeader>
      )}

      {!isCollapsed && (
        <CardContent>
          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Monthly Depreciation</div>
                <div className="text-lg font-semibold">{formatCurrency(summary.monthlyDepreciation)} QAR</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Annual Depreciation</div>
                <div className="text-lg font-semibold">{formatCurrency(summary.annualDepreciation)} QAR</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Useful Life</div>
                <div className="text-lg font-semibold">
                  {Math.floor(summary.usefulLifeMonths / 12)} years{' '}
                  {summary.usefulLifeMonths % 12 > 0 && `${summary.usefulLifeMonths % 12} mo`}
                </div>
              </div>
            </div>
          )}

          {/* Schedule Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Accumulated</TableHead>
                  <TableHead className="text-right">Net Book Value</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleSchedule.map((item, index) => (
                  <TableRow
                    key={index}
                    className={item.status === 'recorded' ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                  >
                    <TableCell className="font-medium">{formatDate(item.periodEnd)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.monthlyAmount)}
                      {item.proRataFactor < 1 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (pro-rata)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.newAccumulatedAmount)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(item.newNetBookValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.status === 'recorded' ? (
                        <Badge variant="default" className="bg-green-600">
                          Recorded
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Projected</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Load More / Show Less */}
          {schedule.length > 12 && (
            <div className="flex justify-center gap-2 mt-4">
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 12, schedule.length))}
                >
                  Show More ({schedule.length - visibleCount} remaining)
                </Button>
              )}
              {visibleCount > 12 && (
                <Button variant="ghost" size="sm" onClick={() => setVisibleCount(12)}>
                  Show Less
                </Button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
