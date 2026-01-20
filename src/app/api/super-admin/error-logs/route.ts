/**
 * @file route.ts
 * @description Error logs API for super admin dashboard
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/error-logs - List all error logs with filters
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const severity = searchParams.get('severity');
    const tenantId = searchParams.get('tenantId');
    const resolved = searchParams.get('resolved');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (source && source !== 'all') {
      where.source = source;
    }

    if (severity && severity !== 'all') {
      where.severity = severity;
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

    // Get errors with pagination
    const [errors, total, typeStats, severityStats] = await Promise.all([
      prisma.errorLog.findMany({
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
      prisma.errorLog.count({ where }),
      // Get stats by type (last 24 hours)
      prisma.errorLog.groupBy({
        by: ['type'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      // Get stats by severity (last 24 hours)
      prisma.errorLog.groupBy({
        by: ['severity'],
        _count: { id: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get unresolved count
    const unresolvedCount = await prisma.errorLog.count({
      where: { resolved: false },
    });

    // Get critical count (last 24 hours)
    const criticalCount = await prisma.errorLog.count({
      where: {
        severity: 'critical',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // Get unique tenants for filter dropdown
    const tenants = await prisma.errorLog.findMany({
      distinct: ['tenantId'],
      select: {
        tenantId: true,
        tenant: {
          select: { name: true, slug: true },
        },
      },
      where: {
        tenantId: { not: null },
      },
    });

    // Get unique sources for filter dropdown
    const sources = await prisma.errorLog.findMany({
      distinct: ['source'],
      select: { source: true },
    });

    return NextResponse.json({
      errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        unresolved: unresolvedCount,
        critical: criticalCount,
        last24Hours: typeStats.reduce((sum, s) => sum + s._count.id, 0),
        byType: typeStats.map(s => ({ type: s.type, count: s._count.id })),
        bySeverity: severityStats.map(s => ({ severity: s.severity, count: s._count.id })),
      },
      tenants: tenants.filter(t => t.tenantId).map(t => ({
        tenantId: t.tenantId,
        name: t.tenant?.name,
        slug: t.tenant?.slug,
      })),
      sources: sources.map(s => s.source),
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to fetch error logs'
    );
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/super-admin/error-logs - Resolve/unresolve errors
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

    await prisma.errorLog.updateMany({
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
      message: `${ids.length} error(s) ${resolved ? 'resolved' : 'reopened'}`,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to update error logs'
    );
    return NextResponse.json(
      { error: 'Failed to update error logs' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/error-logs - Delete old resolved errors
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const olderThanDays = searchParams.get('olderThanDays');
    const deleteAll = searchParams.get('all') === 'true';

    let result;
    let message;

    if (deleteAll) {
      // Delete ALL resolved errors regardless of age
      result = await prisma.errorLog.deleteMany({
        where: { resolved: true },
      });
      message = `Deleted ${result.count} resolved errors`;
    } else {
      // Delete resolved errors older than X days (default 30)
      const days = parseInt(olderThanDays || '30', 10);
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      result = await prisma.errorLog.deleteMany({
        where: {
          resolved: true,
          createdAt: { lt: cutoffDate },
        },
      });
      message = `Deleted ${result.count} resolved errors older than ${days} days`;
    }

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to delete error logs'
    );
    return NextResponse.json(
      { error: 'Failed to delete error logs' },
      { status: 500 }
    );
  }
}
