/**
 * @file route.ts
 * @description Email failures API for super admin dashboard
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/email-failures - List all email failures with filters
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const module = searchParams.get('module');
    const tenantId = searchParams.get('tenantId');
    const resolved = searchParams.get('resolved');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (module && module !== 'all') {
      where.module = module;
    }

    if (tenantId && tenantId !== 'all') {
      where.tenantId = tenantId;
    }

    if (resolved !== null && resolved !== 'all') {
      where.resolved = resolved === 'true';
    }

    if (startDate) {
      where.createdAt = {
        ...(where.createdAt as object || {}),
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...(where.createdAt as object || {}),
        lte: new Date(endDate),
      };
    }

    // Get failures with pagination
    const [failures, total, stats] = await Promise.all([
      prisma.emailFailureLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tenant: {
            select: { name: true, slug: true },
          },
        },
      }),
      prisma.emailFailureLog.count({ where }),
      // Get summary stats
      prisma.emailFailureLog.groupBy({
        by: ['module'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    // Get unresolved count
    const unresolvedCount = await prisma.emailFailureLog.count({
      where: { resolved: false },
    });

    // Get unique tenants for filter dropdown
    const tenants = await prisma.emailFailureLog.findMany({
      distinct: ['tenantId'],
      select: {
        tenantId: true,
        organizationName: true,
        organizationSlug: true,
      },
      where: {
        tenantId: { not: null },
      },
    });

    return NextResponse.json({
      failures,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        unresolved: unresolvedCount,
        last24Hours: stats.reduce((sum, s) => sum + s._count.id, 0),
        byModule: stats.map(s => ({ module: s.module, count: s._count.id })),
      },
      tenants: tenants.filter(t => t.tenantId),
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to fetch email failures'
    );
    return NextResponse.json(
      { error: 'Failed to fetch email failures' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/super-admin/email-failures - Resolve/unresolve failures
// ═══════════════════════════════════════════════════════════════════════════════

const resolveSchema = z.object({
  ids: z.array(z.string()).min(1),
  resolved: z.boolean(),
  resolutionNotes: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = resolveSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ids, resolved, resolutionNotes } = result.data;

    await prisma.emailFailureLog.updateMany({
      where: { id: { in: ids } },
      data: {
        resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? session.user.email : null,
        resolutionNotes: resolved ? resolutionNotes : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${ids.length} failure(s) ${resolved ? 'resolved' : 'reopened'}`,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to update email failures'
    );
    return NextResponse.json(
      { error: 'Failed to update email failures' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/email-failures - Delete old resolved failures
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30', 10);

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    const result = await prisma.emailFailureLog.deleteMany({
      where: {
        resolved: true,
        createdAt: { lt: cutoffDate },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} resolved failures older than ${olderThanDays} days`,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to delete email failures'
    );
    return NextResponse.json(
      { error: 'Failed to delete email failures' },
      { status: 500 }
    );
  }
}
