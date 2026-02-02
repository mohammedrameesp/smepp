/**
 * @file route.ts
 * @description AI usage statistics per organization for billing and monitoring
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // day, week, month, all
    const orgId = searchParams.get('orgId'); // Optional: filter by specific org

    // Calculate date range
    const now = new Date();
    let dateFrom: Date | undefined;
    let daysToFetch = 30;

    switch (period) {
      case 'day':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        daysToFetch = 1;
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        daysToFetch = 7;
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        daysToFetch = 30;
        break;
      case 'all':
      default:
        dateFrom = undefined;
        daysToFetch = 90; // Default to 90 days for daily usage chart
    }

    // Build where clause
    const where: {
      tenantId?: string;
      createdAt?: { gte: Date };
    } = {};

    if (orgId) {
      where.tenantId = orgId;
    }
    if (dateFrom) {
      where.createdAt = { gte: dateFrom };
    }

    // Aggregate usage by organization
    const usageByOrg = await prisma.aIChatUsage.groupBy({
      by: ['tenantId'],
      where,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      },
    });

    // Get organization names
    const orgIds = usageByOrg.map((u) => u.tenantId);
    const organizations = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true, slug: true, aiChatEnabled: true },
    });

    const orgMap = new Map(organizations.map((o) => [o.id, o]));

    // Build response
    const orgUsage = usageByOrg.map((u) => ({
      organizationId: u.tenantId,
      organizationName: orgMap.get(u.tenantId)?.name || 'Unknown',
      organizationSlug: orgMap.get(u.tenantId)?.slug || 'unknown',
      aiChatEnabled: orgMap.get(u.tenantId)?.aiChatEnabled || false,
      promptTokens: u._sum.promptTokens || 0,
      completionTokens: u._sum.completionTokens || 0,
      totalTokens: u._sum.totalTokens || 0,
      totalCostUsd: u._sum.costUsd || 0,
      apiCallCount: u._count.id,
    }));

    // Sort by cost descending
    orgUsage.sort((a, b) => b.totalCostUsd - a.totalCostUsd);

    // Calculate totals
    const totals = {
      totalTokens: orgUsage.reduce((sum, o) => sum + o.totalTokens, 0),
      totalCostUsd: orgUsage.reduce((sum, o) => sum + o.totalCostUsd, 0),
      totalApiCalls: orgUsage.reduce((sum, o) => sum + o.apiCallCount, 0),
      organizationCount: orgUsage.length,
    };

    // Get daily usage for trend chart
    const dailyUsageStart = new Date(now.getTime() - daysToFetch * 24 * 60 * 60 * 1000);
    const dailyUsageWhere: {
      tenantId?: string;
      createdAt: { gte: Date };
    } = {
      createdAt: { gte: dailyUsageStart },
    };
    if (orgId) {
      dailyUsageWhere.tenantId = orgId;
    }

    const rawDailyUsage = await prisma.aIChatUsage.findMany({
      where: dailyUsageWhere,
      select: {
        createdAt: true,
        totalTokens: true,
        costUsd: true,
      },
    });

    // Aggregate by day
    const dailyMap = new Map<string, { tokens: number; cost: number; calls: number }>();
    for (const usage of rawDailyUsage) {
      const dateKey = usage.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { tokens: 0, cost: 0, calls: 0 };
      existing.tokens += usage.totalTokens || 0;
      existing.cost += usage.costUsd || 0;
      existing.calls += 1;
      dailyMap.set(dateKey, existing);
    }

    // Fill in missing days with zeros
    const dailyUsage: Array<{ date: string; tokens: number; cost: number; calls: number }> = [];
    for (let i = daysToFetch - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const data = dailyMap.get(dateKey) || { tokens: 0, cost: 0, calls: 0 };
      dailyUsage.push({
        date: dateKey,
        ...data,
      });
    }

    // Get audit summary
    const auditWhere: {
      tenantId?: string;
      createdAt?: { gte: Date };
    } = {};
    if (orgId) {
      auditWhere.tenantId = orgId;
    }
    if (dateFrom) {
      auditWhere.createdAt = { gte: dateFrom };
    }

    const [auditStats, flaggedCount, activeAIOrgsCount] = await Promise.all([
      prisma.aIChatAuditLog.aggregate({
        where: auditWhere,
        _count: { id: true },
        _avg: { riskScore: true },
      }),
      prisma.aIChatAuditLog.count({
        where: { ...auditWhere, flagged: true },
      }),
      prisma.organization.count({
        where: { aiChatEnabled: true },
      }),
    ]);

    return NextResponse.json({
      organizations: orgUsage,
      totals,
      period,
      dailyUsage,
      auditSummary: {
        totalQueries: auditStats._count.id,
        avgRiskScore: Math.round(auditStats._avg.riskScore || 0),
        flaggedQueries: flaggedCount,
        activeAIOrgs: activeAIOrgsCount,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'AI usage stats error');
    return NextResponse.json(
      { error: 'Failed to get AI usage stats' },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
