import { prisma } from '@/lib/core/prisma';
import { Card } from '@/components/ui/card';
import {
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';

async function getAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousThirtyDays = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    totalOrgs,
    totalUsers,
    orgsThisMonth,
    orgsPreviousMonth,
    usersThisMonth,
    usersPreviousMonth,
    orgsThisWeek,
    usersThisWeek,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.organization.count({ where: { createdAt: { gte: previousThirtyDays, lt: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, isSuperAdmin: false } }),
    prisma.user.count({ where: { createdAt: { gte: previousThirtyDays, lt: thirtyDaysAgo }, isSuperAdmin: false } }),
    prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, isSuperAdmin: false } }),
  ]);

  const orgGrowth = orgsPreviousMonth > 0
    ? Math.round(((orgsThisMonth - orgsPreviousMonth) / orgsPreviousMonth) * 100)
    : orgsThisMonth > 0 ? 100 : 0;
  const userGrowth = usersPreviousMonth > 0
    ? Math.round(((usersThisMonth - usersPreviousMonth) / usersPreviousMonth) * 100)
    : usersThisMonth > 0 ? 100 : 0;

  return {
    totalOrgs,
    totalUsers,
    orgsThisMonth,
    usersThisMonth,
    orgsThisWeek,
    usersThisWeek,
    orgGrowth,
    userGrowth,
  };
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500">Platform growth and metrics overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Organizations"
          value={analytics.totalOrgs}
          subValue={`+${analytics.orgsThisWeek} this week`}
          trend={analytics.orgGrowth}
        />
        <MetricCard
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Total Users"
          value={analytics.totalUsers}
          subValue={`+${analytics.usersThisWeek} this week`}
          trend={analytics.userGrowth}
        />
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Monthly Growth</h3>
        <div className="grid grid-cols-2 gap-6">
          <GrowthItem
            label="Organizations"
            current={analytics.orgsThisMonth}
            period="30 days"
            growth={analytics.orgGrowth}
          />
          <GrowthItem
            label="Users"
            current={analytics.usersThisMonth}
            period="30 days"
            growth={analytics.userGrowth}
          />
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subValue,
  trend,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  subValue: string;
  trend?: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-xs text-slate-500">{subValue}</span>
        {trend !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function GrowthItem({
  label,
  current,
  period,
  growth,
}: {
  label: string;
  current: number;
  period: string;
  growth: number;
}) {
  const isPositive = growth >= 0;

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">+{current} in last {period}</p>
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {Math.abs(growth)}%
      </div>
    </div>
  );
}
