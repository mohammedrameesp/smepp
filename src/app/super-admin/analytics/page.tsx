import { prisma } from '@/lib/core/prisma';
import { Card } from '@/components/ui/card';
import {
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
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
    tierDistribution,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.organization.count({ where: { createdAt: { gte: previousThirtyDays, lt: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, isSuperAdmin: false } }),
    prisma.user.count({ where: { createdAt: { gte: previousThirtyDays, lt: thirtyDaysAgo }, isSuperAdmin: false } }),
    prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, isSuperAdmin: false } }),
    prisma.organization.groupBy({
      by: ['subscriptionTier'],
      _count: true,
    }),
  ]);

  // Calculate growth percentages
  const orgGrowth = orgsPreviousMonth > 0
    ? Math.round(((orgsThisMonth - orgsPreviousMonth) / orgsPreviousMonth) * 100)
    : orgsThisMonth > 0 ? 100 : 0;
  const userGrowth = usersPreviousMonth > 0
    ? Math.round(((usersThisMonth - usersPreviousMonth) / usersPreviousMonth) * 100)
    : usersThisMonth > 0 ? 100 : 0;

  // Format tier distribution
  const tiers = tierDistribution.reduce((acc, tier) => {
    acc[tier.subscriptionTier] = tier._count;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalOrgs,
    totalUsers,
    orgsThisMonth,
    usersThisMonth,
    orgsThisWeek,
    usersThisWeek,
    orgGrowth,
    userGrowth,
    tiers: {
      FREE: tiers.FREE || 0,
      STARTER: tiers.STARTER || 0,
      PROFESSIONAL: tiers.PROFESSIONAL || 0,
      ENTERPRISE: tiers.ENTERPRISE || 0,
    },
  };
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500">Platform growth and metrics overview</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Total Organizations"
          value={analytics.totalOrgs}
          subValue={`+${analytics.orgsThisMonth} this month`}
          trend={analytics.orgGrowth}
        />
        <MetricCard
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Total Users"
          value={analytics.totalUsers}
          subValue={`+${analytics.usersThisMonth} this month`}
          trend={analytics.userGrowth}
        />
        <MetricCard
          icon={Activity}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="New This Week"
          value={analytics.orgsThisWeek}
          subValue="organizations"
        />
        <MetricCard
          icon={TrendingUp}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="New Users This Week"
          value={analytics.usersThisWeek}
          subValue="users joined"
        />
      </div>

      {/* Tier Distribution */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Subscription Tiers</h3>
          <div className="space-y-4">
            <TierBar
              label="Free"
              count={analytics.tiers.FREE}
              total={analytics.totalOrgs}
              color="bg-slate-400"
            />
            <TierBar
              label="Starter"
              count={analytics.tiers.STARTER}
              total={analytics.totalOrgs}
              color="bg-blue-500"
            />
            <TierBar
              label="Professional"
              count={analytics.tiers.PROFESSIONAL}
              total={analytics.totalOrgs}
              color="bg-indigo-500"
            />
            <TierBar
              label="Enterprise"
              count={analytics.tiers.ENTERPRISE}
              total={analytics.totalOrgs}
              color="bg-amber-500"
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Growth Summary</h3>
          <div className="space-y-4">
            <GrowthItem
              label="Organization Growth"
              current={analytics.orgsThisMonth}
              period="30 days"
              growth={analytics.orgGrowth}
            />
            <GrowthItem
              label="User Growth"
              current={analytics.usersThisMonth}
              period="30 days"
              growth={analytics.userGrowth}
            />
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Avg Users per Org</span>
                <span className="font-semibold text-slate-900">
                  {analytics.totalOrgs > 0
                    ? (analytics.totalUsers / analytics.totalOrgs).toFixed(1)
                    : '0'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Paid Conversion Rate</span>
              <span className="font-semibold text-slate-900">
                {analytics.totalOrgs > 0
                  ? Math.round(((analytics.tiers.STARTER + analytics.tiers.PROFESSIONAL + analytics.tiers.ENTERPRISE) / analytics.totalOrgs) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Tier Breakdown Cards */}
      <div className="grid grid-cols-4 gap-4">
        <TierCard tier="FREE" count={analytics.tiers.FREE} total={analytics.totalOrgs} />
        <TierCard tier="STARTER" count={analytics.tiers.STARTER} total={analytics.totalOrgs} />
        <TierCard tier="PROFESSIONAL" count={analytics.tiers.PROFESSIONAL} total={analytics.totalOrgs} />
        <TierCard tier="ENTERPRISE" count={analytics.tiers.ENTERPRISE} total={analytics.totalOrgs} />
      </div>
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
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function TierBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-medium text-slate-900">{count}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
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

function TierCard({
  tier,
  count,
  total,
}: {
  tier: string;
  count: number;
  total: number;
}) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    FREE: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    STARTER: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    PROFESSIONAL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    ENTERPRISE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  };

  const color = colors[tier] || colors.FREE;
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card className={`p-4 ${color.bg} border ${color.border}`}>
      <p className={`text-sm font-medium ${color.text}`}>{tier}</p>
      <p className={`text-2xl font-bold ${color.text} mt-1`}>{count}</p>
      <p className="text-xs text-slate-500 mt-1">{percentage}% of total</p>
    </Card>
  );
}
