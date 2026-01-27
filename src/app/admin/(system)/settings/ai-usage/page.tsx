'use client';

import { useState, useEffect } from 'react';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { formatNumber } from '@/lib/utils/math-utils';
import { formatDayMonth, formatDate, formatRelativeTime } from '@/lib/core/datetime';
import { ICON_SIZES } from '@/lib/constants';

interface UsageData {
  overview: {
    monthlyTokensUsed: number;
    monthlyTokenLimit: number;
    monthlyRequestCount: number;
    percentUsed: number;
    estimatedCost: number;
    tier: string;
  };
  usageByUser: Array<{
    userId: string;
    userName: string;
    email: string;
    totalTokens: number;
    requestCount: number;
    lastUsed: string | null;
  }>;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    requests: number;
  }>;
  auditSummary: {
    totalQueries: number;
    flaggedQueries: number;
    uniqueUsers: number;
    avgRiskScore: number;
    topFunctions: Array<{ name: string; count: number }>;
  };
  flaggedQueries: Array<{
    id: string;
    userId: string;
    riskScore: number;
    flagReasons: string[];
    createdAt: string;
  }>;
  limits: {
    daily: number;
    monthly: number;
    requestsPerHour: number;
  };
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// formatLastUsed uses the datetime module's formatRelativeTime for recent dates
function formatLastUsed(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return formatRelativeTime(dateStr) || formatDate(dateStr);
}

export default function AIUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState('30');

  useEffect(() => {
    async function fetchUsage() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/ai-usage?days=${days}`);
        if (!response.ok) {
          throw new Error('Failed to load usage data');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [days]);

  if (loading) {
    return (
      <>
        <PageHeader title="AI Usage" subtitle="Monitor AI assistant usage and costs" />
        <PageContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </PageContent>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="AI Usage" subtitle="Monitor AI assistant usage and costs" />
        <PageContent>
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-red-600">{error || 'Failed to load data'}</p>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  const { overview, usageByUser, dailyUsage, auditSummary, flaggedQueries, limits } = data;

  // Calculate max daily tokens for chart scaling
  const maxDailyTokens = Math.max(...dailyUsage.map(d => d.tokens), 1);

  return (
    <>
      <PageHeader
        title="AI Usage"
        subtitle="Monitor AI assistant usage, costs, and security metrics"
        actions={
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Monthly Tokens</p>
                    <p className="text-2xl font-bold">{formatLargeNumber(overview.monthlyTokensUsed)}</p>
                    <p className="text-xs text-muted-foreground">
                      of {formatLargeNumber(overview.monthlyTokenLimit)} limit
                    </p>
                  </div>
                  <Sparkles className={`${ICON_SIZES.xl} text-blue-500`} />
                </div>
                <Progress
                  value={overview.percentUsed}
                  className={cn(
                    "mt-3",
                    overview.percentUsed >= 90 && "[&>div]:bg-red-500",
                    overview.percentUsed >= 75 && overview.percentUsed < 90 && "[&>div]:bg-yellow-500"
                  )}
                />
                <p className={cn(
                  "text-xs mt-1",
                  overview.percentUsed >= 90 ? "text-red-500" :
                  overview.percentUsed >= 75 ? "text-yellow-600" :
                  "text-muted-foreground"
                )}>
                  {overview.percentUsed}% used this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold">{formatLargeNumber(overview.monthlyRequestCount)}</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                  <TrendingUp className={`${ICON_SIZES.xl} text-green-500`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                    <p className="text-2xl font-bold">{auditSummary.uniqueUsers}</p>
                    <p className="text-xs text-muted-foreground">Using AI chat</p>
                  </div>
                  <Users className={`${ICON_SIZES.xl} text-purple-500`} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Est. Cost</p>
                    <p className="text-2xl font-bold">${formatNumber(overview.estimatedCost)}</p>
                    <p className="text-xs text-muted-foreground">This month</p>
                  </div>
                  <DollarSign className={`${ICON_SIZES.xl} text-emerald-500`} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="usage" className="space-y-4">
            <TabsList>
              <TabsTrigger value="usage">Usage Trends</TabsTrigger>
              <TabsTrigger value="users">By User</TabsTrigger>
              <TabsTrigger value="functions">Popular Functions</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className={ICON_SIZES.md} />
                    Daily Token Usage
                  </CardTitle>
                  <CardDescription>Token consumption over the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyUsage.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No usage data available</p>
                  ) : (
                    <div className="h-64 flex items-end gap-1">
                      {dailyUsage.map((day, i) => (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center group"
                          title={`${day.date}: ${formatLargeNumber(day.tokens)} tokens, ${day.requests} requests`}
                        >
                          <div
                            className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors min-h-[2px]"
                            style={{ height: `${(day.tokens / maxDailyTokens) * 100}%` }}
                          />
                          {i % Math.ceil(dailyUsage.length / 7) === 0 && (
                            <span className="text-[10px] text-muted-foreground mt-1 rotate-45 origin-left">
                              {formatDayMonth(day.date)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Usage by User</CardTitle>
                  <CardDescription>Token consumption per user</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                        <TableHead className="text-right">Last Used</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageByUser.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No usage data
                          </TableCell>
                        </TableRow>
                      ) : (
                        usageByUser.map(user => (
                          <TableRow key={user.userId}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.userName}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatLargeNumber(user.totalTokens)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {user.requestCount}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatLastUsed(user.lastUsed)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="functions">
              <Card>
                <CardHeader>
                  <CardTitle>Most Used Functions</CardTitle>
                  <CardDescription>AI function calls by popularity</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditSummary.topFunctions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No function call data</p>
                  ) : (
                    <div className="space-y-4">
                      {auditSummary.topFunctions.map((func, i) => {
                        const maxCount = auditSummary.topFunctions[0].count;
                        const percent = (func.count / maxCount) * 100;
                        return (
                          <div key={func.name} className="flex items-center gap-4">
                            <span className="w-6 text-muted-foreground text-sm">{i + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-sm">{func.name}</span>
                                <span className="text-sm text-muted-foreground">{func.count} calls</span>
                              </div>
                              <Progress value={percent} className="h-2" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Flagged Queries</p>
                        <p className="text-2xl font-bold">{auditSummary.flaggedQueries}</p>
                      </div>
                      <AlertTriangle className={cn(
                        "h-8 w-8",
                        auditSummary.flaggedQueries > 0 ? "text-amber-500" : "text-gray-300"
                      )} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Avg Risk Score</p>
                        <p className="text-2xl font-bold">{auditSummary.avgRiskScore}</p>
                      </div>
                      <Shield className={cn(
                        "h-8 w-8",
                        auditSummary.avgRiskScore >= 30 ? "text-red-500" :
                        auditSummary.avgRiskScore >= 15 ? "text-amber-500" :
                        "text-green-500"
                      )} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Queries</p>
                        <p className="text-2xl font-bold">{formatLargeNumber(auditSummary.totalQueries)}</p>
                      </div>
                      <Sparkles className={`${ICON_SIZES.xl} text-blue-500`} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Flagged Queries</CardTitle>
                  <CardDescription>Queries flagged for potential security concerns</CardDescription>
                </CardHeader>
                <CardContent>
                  {flaggedQueries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No flagged queries</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Risk Score</TableHead>
                          <TableHead>Flags</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flaggedQueries.map(query => (
                          <TableRow key={query.id}>
                            <TableCell>
                              <Badge variant={
                                query.riskScore >= 50 ? "destructive" :
                                query.riskScore >= 30 ? "default" :
                                "secondary"
                              }>
                                {query.riskScore}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {query.flagReasons.map(reason => (
                                  <Badge key={reason} variant="outline" className="text-xs">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatLastUsed(query.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Rate Limits Info */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
              <CardDescription>Current limits for your {overview.tier} plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Token Limit</p>
                  <p className="text-xl font-bold">{formatLargeNumber(limits.daily)}</p>
                  <p className="text-xs text-muted-foreground">per user</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monthly Token Budget</p>
                  <p className="text-xl font-bold">{formatLargeNumber(limits.monthly)}</p>
                  <p className="text-xs text-muted-foreground">organization-wide</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hourly Rate Limit</p>
                  <p className="text-xl font-bold">{limits.requestsPerHour}</p>
                  <p className="text-xs text-muted-foreground">requests per user</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
