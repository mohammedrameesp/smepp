import { prisma } from '@/lib/core/prisma';
import { Card } from '@/components/ui/card';
import {
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { ModuleUsageChart } from './components/ModuleUsageChart';
import { OnboardingFunnel } from './components/OnboardingFunnel';
import { OrganizationBreakdown } from './components/OrganizationBreakdown';

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

async function getDetailedAnalytics() {
  // Get all organizations with their settings
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      subscriptionTier: true,
      enabledModules: true,
      setupProgress: {
        select: {
          profileComplete: true,
          logoUploaded: true,
          brandingConfigured: true,
          firstAssetAdded: true,
          firstTeamMemberInvited: true,
          firstEmployeeAdded: true,
        },
      },
    },
  });

  // Module adoption rates
  const allModules = [
    'assets',
    'subscriptions',
    'suppliers',
    'employees',
    'leave',
    'payroll',
    'spend-requests',
  ];

  const totalOrgs = organizations.length;

  const moduleUsage = allModules.map((module) => {
    const count = organizations.filter((org) =>
      org.enabledModules?.includes(module)
    ).length;
    return {
      name: module
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      count,
      percentage: totalOrgs > 0 ? Math.round((count / totalOrgs) * 100) : 0,
    };
  }).sort((a, b) => b.count - a.count);

  // Tier distribution
  const tierDistribution = {
    FREE: 0,
    STARTER: 0,
    PROFESSIONAL: 0,
    ENTERPRISE: 0,
  };

  organizations.forEach((org) => {
    const tier = org.subscriptionTier as keyof typeof tierDistribution;
    if (tier in tierDistribution) {
      tierDistribution[tier]++;
    }
  });

  // Onboarding funnel
  const onboardingStats = {
    profileComplete: 0,
    logoUploaded: 0,
    brandingConfigured: 0,
    firstAssetAdded: 0,
    firstTeamMemberInvited: 0,
    firstEmployeeAdded: 0,
  };

  organizations.forEach((org) => {
    if (org.setupProgress?.profileComplete) onboardingStats.profileComplete++;
    if (org.setupProgress?.logoUploaded) onboardingStats.logoUploaded++;
    if (org.setupProgress?.brandingConfigured) onboardingStats.brandingConfigured++;
    if (org.setupProgress?.firstAssetAdded) onboardingStats.firstAssetAdded++;
    if (org.setupProgress?.firstTeamMemberInvited) onboardingStats.firstTeamMemberInvited++;
    if (org.setupProgress?.firstEmployeeAdded) onboardingStats.firstEmployeeAdded++;
  });

  const onboardingFunnel = [
    {
      step: 'Complete Profile',
      count: onboardingStats.profileComplete,
      percentage: totalOrgs > 0 ? Math.round((onboardingStats.profileComplete / totalOrgs) * 100) : 0,
    },
    {
      step: 'Upload Logo',
      count: onboardingStats.logoUploaded,
      percentage: totalOrgs > 0 ? Math.round((onboardingStats.logoUploaded / totalOrgs) * 100) : 0,
    },
    {
      step: 'Configure Branding',
      count: onboardingStats.brandingConfigured,
      percentage: totalOrgs > 0 ? Math.round((onboardingStats.brandingConfigured / totalOrgs) * 100) : 0,
    },
    {
      step: 'Add First Asset',
      count: onboardingStats.firstAssetAdded,
      percentage: totalOrgs > 0 ? Math.round((onboardingStats.firstAssetAdded / totalOrgs) * 100) : 0,
    },
    {
      step: 'Invite Team Member',
      count: onboardingStats.firstTeamMemberInvited,
      percentage: totalOrgs > 0 ? Math.round((onboardingStats.firstTeamMemberInvited / totalOrgs) * 100) : 0,
    },
    {
      step: 'Add First Employee',
      count: onboardingStats.firstEmployeeAdded,
      percentage: totalOrgs > 0 ? Math.round((onboardingStats.firstEmployeeAdded / totalOrgs) * 100) : 0,
    },
  ];

  return {
    totalOrgs,
    moduleUsage,
    tierDistribution: [
      { tier: 'Free', count: tierDistribution.FREE },
      { tier: 'Starter', count: tierDistribution.STARTER },
      { tier: 'Professional', count: tierDistribution.PROFESSIONAL },
      { tier: 'Enterprise', count: tierDistribution.ENTERPRISE },
    ],
    onboardingFunnel,
  };
}

export default async function AnalyticsPage() {
  const [analytics, detailedAnalytics] = await Promise.all([
    getAnalytics(),
    getDetailedAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-slate-500">Platform growth and metrics overview</p>
      </div>

      {/* Top Stats */}
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

      {/* Monthly Growth */}
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

      {/* Detailed Analytics Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Module Usage */}
        <ModuleUsageChart
          data={detailedAnalytics.moduleUsage}
          totalOrgs={detailedAnalytics.totalOrgs}
        />

        {/* Tier Distribution */}
        <OrganizationBreakdown
          data={detailedAnalytics.tierDistribution}
          totalOrgs={detailedAnalytics.totalOrgs}
        />
      </div>

      {/* Onboarding Funnel */}
      <OnboardingFunnel
        data={detailedAnalytics.onboardingFunnel}
        totalOrgs={detailedAnalytics.totalOrgs}
      />
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
