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

    switch (period) {
      case 'day':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        dateFrom = undefined;
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

    return NextResponse.json({
      organizations: orgUsage,
      totals,
      period,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'AI usage stats error');
    return NextResponse.json(
      { error: 'Failed to get AI usage stats' },
      { status: 500 }
    );
  }
}
