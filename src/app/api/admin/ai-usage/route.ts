import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { getLimitsForTier } from '@/lib/ai/rate-limiter';
import { getAuditSummary, getFlaggedQueries } from '@/lib/ai/audit-logger';

interface MemberUsage {
  memberId: string;
  memberName: string;
  email: string;
  totalTokens: number;
  requestCount: number;
  lastUsed: Date | null;
}

interface DailyUsage {
  date: string;
  tokens: number;
  requests: number;
}

/**
 * GET /api/admin/ai-usage - Get AI usage statistics for the organization
 */
export const GET = withErrorHandler(async (request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  // Get date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const monthStart = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1);

  // Get organization details (non-tenant model, use raw prisma)
  const org = await prisma.organization.findUnique({
    where: { id: tenant.tenantId },
    select: {
      name: true,
      subscriptionTier: true,
      aiTokenBudgetMonthly: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const limits = getLimitsForTier(org.subscriptionTier);
  const monthlyLimit = org.aiTokenBudgetMonthly || limits.monthlyTokens;

  // Get monthly token usage (tenant-scoped)
  const monthlyUsage = await db.aIChatUsage.aggregate({
    where: {
      createdAt: { gte: monthStart },
    },
    _sum: { totalTokens: true },
    _count: true,
  });

  const monthlyTokensUsed = monthlyUsage._sum.totalTokens || 0;
  const monthlyRequestCount = monthlyUsage._count || 0;

  // Get usage by member (tenant-scoped)
  const memberUsageData = await db.aIChatUsage.groupBy({
    by: ['memberId'],
    where: {
      createdAt: { gte: startDate },
    },
    _sum: { totalTokens: true },
    _count: true,
    _max: { createdAt: true },
  });

  // Get member details (tenant-scoped)
  const memberIds = memberUsageData.map(u => u.memberId);
  const members = await db.teamMember.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true, email: true },
  });

  const memberMap = new Map(members.map(m => [m.id, m]));

  const usageByMember: MemberUsage[] = memberUsageData.map(u => {
    const member = memberMap.get(u.memberId);
    return {
      memberId: u.memberId,
      memberName: member?.name || 'Unknown',
      email: member?.email || '',
      totalTokens: u._sum.totalTokens || 0,
      requestCount: u._count || 0,
      lastUsed: u._max.createdAt,
    };
  }).sort((a, b) => b.totalTokens - a.totalTokens);

  // Get daily usage for trend chart (use raw query with tenant filter)
  const dailyUsageData = await prisma.$queryRaw<Array<{ date: Date; tokens: bigint; requests: bigint }>>`
    SELECT
      DATE(created_at) as date,
      SUM(total_tokens) as tokens,
      COUNT(*) as requests
    FROM "AIChatUsage"
    WHERE tenant_id = ${tenant.tenantId}
      AND created_at >= ${startDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  const dailyUsage: DailyUsage[] = dailyUsageData.map(d => ({
    date: new Date(d.date).toISOString().split('T')[0],
    tokens: Number(d.tokens) || 0,
    requests: Number(d.requests) || 0,
  }));

  // Get audit summary
  const auditSummary = await getAuditSummary(tenant.tenantId, startDate, endDate);

  // Get recent flagged queries (for security monitoring)
  const flaggedQueries = await getFlaggedQueries(tenant.tenantId, 10);

  // Calculate cost estimate (rough estimate based on OpenAI pricing)
  // GPT-4: ~$0.03/1K input tokens, ~$0.06/1K output tokens
  // We use an average of $0.04/1K tokens
  const estimatedCost = (monthlyTokensUsed / 1000) * 0.04;

  return NextResponse.json({
    overview: {
      monthlyTokensUsed,
      monthlyTokenLimit: monthlyLimit,
      monthlyRequestCount,
      percentUsed: Math.round((monthlyTokensUsed / monthlyLimit) * 100),
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      tier: org.subscriptionTier,
    },
    usageByMember,
    dailyUsage,
    auditSummary: {
      totalQueries: auditSummary.totalQueries,
      flaggedQueries: auditSummary.flaggedQueries,
      uniqueMembers: auditSummary.uniqueMembers,
      avgRiskScore: auditSummary.avgRiskScore,
      topFunctions: auditSummary.topFunctions,
    },
    flaggedQueries: flaggedQueries.map(q => ({
      id: q.id,
      memberId: q.memberId,
      riskScore: q.riskScore,
      flagReasons: q.flagReasons,
      createdAt: q.createdAt,
    })),
    limits: {
      daily: limits.dailyTokens,
      monthly: monthlyLimit,
      requestsPerHour: limits.requestsPerHour,
    },
  });
}, { requireAuth: true, requireAdmin: true });
