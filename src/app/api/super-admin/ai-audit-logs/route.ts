/**
 * @file route.ts
 * @description Platform-wide AI audit logs with filtering for super admin
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
    const orgId = searchParams.get('orgId');
    const minRiskScore = searchParams.get('minRiskScore');
    const flaggedOnly = searchParams.get('flagged') === 'true';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      tenantId?: string;
      flagged?: boolean;
      riskScore?: { gte: number };
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (orgId) {
      where.tenantId = orgId;
    }
    if (flaggedOnly) {
      where.flagged = true;
    }
    if (minRiskScore) {
      where.riskScore = { gte: parseInt(minRiskScore, 10) };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch audit logs with pagination
    const [logs, totalCount] = await Promise.all([
      prisma.aIChatAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          tenantId: true,
          memberId: true,
          queryHash: true,
          queryLength: true,
          functionsCalled: true,
          dataAccessed: true,
          tokensUsed: true,
          responseTimeMs: true,
          flagged: true,
          flagReasons: true,
          riskScore: true,
          createdAt: true,
        },
      }),
      prisma.aIChatAuditLog.count({ where }),
    ]);

    // Get organization and member details
    const tenantIds = [...new Set(logs.map((l) => l.tenantId))];
    const memberIds = [...new Set(logs.map((l) => l.memberId))];

    const [organizations, members] = await Promise.all([
      prisma.organization.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, slug: true },
      }),
      prisma.teamMember.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, name: true, email: true },
      }),
    ]);

    const orgMap = new Map(organizations.map((o) => [o.id, o]));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // Enrich logs with org and member names
    const enrichedLogs = logs.map((log) => ({
      ...log,
      organizationName: orgMap.get(log.tenantId)?.name || 'Unknown',
      organizationSlug: orgMap.get(log.tenantId)?.slug || 'unknown',
      memberName: memberMap.get(log.memberId)?.name || 'Unknown',
      memberEmail: memberMap.get(log.memberId)?.email || 'unknown',
    }));

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'AI audit logs error');
    return NextResponse.json(
      { error: 'Failed to get AI audit logs' },
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
