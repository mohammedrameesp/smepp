/**
 * @file route.ts
 * @description Detailed analytics API for super-admin dashboard
 * @module super-admin/analytics
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get all organizations with their settings
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        subscriptionTier: true,
        enabledModules: true,
        createdAt: true,
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
        _count: {
          select: {
            teamMembers: true,
          },
        },
      },
    });

    // Module adoption rates
    const moduleStats: Record<string, number> = {};
    const allModules = [
      'assets',
      'subscriptions',
      'suppliers',
      'employees',
      'leave',
      'payroll',
      'purchase-requests',
    ];

    allModules.forEach((module) => {
      moduleStats[module] = organizations.filter((org) =>
        org.enabledModules?.includes(module)
      ).length;
    });

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

    // Onboarding funnel (completion rates for each step)
    const onboardingStats = {
      profileComplete: 0,
      logoUploaded: 0,
      brandingConfigured: 0,
      firstAssetAdded: 0,
      firstTeamMemberInvited: 0,
      firstEmployeeAdded: 0,
    };

    const orgsWithProgress = organizations.filter((org) => org.setupProgress);
    orgsWithProgress.forEach((org) => {
      if (org.setupProgress?.profileComplete) onboardingStats.profileComplete++;
      if (org.setupProgress?.logoUploaded) onboardingStats.logoUploaded++;
      if (org.setupProgress?.brandingConfigured) onboardingStats.brandingConfigured++;
      if (org.setupProgress?.firstAssetAdded) onboardingStats.firstAssetAdded++;
      if (org.setupProgress?.firstTeamMemberInvited) onboardingStats.firstTeamMemberInvited++;
      if (org.setupProgress?.firstEmployeeAdded) onboardingStats.firstEmployeeAdded++;
    });

    // Calculate percentages
    const totalOrgs = organizations.length;
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

    // Organizations created over time (last 12 months)
    const now = new Date();

    const monthlyOrgs: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleString('default', { month: 'short', year: '2-digit' });

      const count = organizations.filter((org) => {
        const created = new Date(org.createdAt);
        return created >= monthStart && created <= monthEnd;
      }).length;

      monthlyOrgs.push({ month: monthName, count });
    }

    // Format module usage for chart
    const moduleUsage = allModules.map((module) => ({
      name: module
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      count: moduleStats[module],
      percentage: totalOrgs > 0 ? Math.round((moduleStats[module] / totalOrgs) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalOrganizations: totalOrgs,
      moduleUsage,
      tierDistribution: [
        { tier: 'Free', count: tierDistribution.FREE },
        { tier: 'Starter', count: tierDistribution.STARTER },
        { tier: 'Professional', count: tierDistribution.PROFESSIONAL },
        { tier: 'Enterprise', count: tierDistribution.ENTERPRISE },
      ],
      onboardingFunnel,
      monthlyOrgs,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Analytics API error');
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
