/**
 * @file route.ts
 * @description Monthly depreciation cron job for all tenants
 * @module api/cron/depreciation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { runDepreciationForTenant } from '@/features/assets/lib/depreciation';
import logger from '@/lib/core/log';

/**
 * Verify cron secret for scheduled jobs
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

/**
 * POST /api/cron/depreciation - Run monthly depreciation for all tenants
 *
 * This endpoint is designed to be called by a cron job scheduler (e.g., Vercel Cron)
 * at the beginning of each month to calculate depreciation for all eligible assets.
 *
 * Recommended schedule: Monthly on the 1st at 00:05 UTC (3:05 AM Qatar time)
 *
 * Example vercel.json configuration:
 * {
 *   "crons": [{
 *     "path": "/api/cron/depreciation",
 *     "schedule": "5 0 1 * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  // Verify cron authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  logger.info('Starting monthly depreciation run');

  try {
    // Get calculation date from request body or use current date
    const body = await request.json().catch(() => ({}));
    const calculationDate = body.calculationDate ? new Date(body.calculationDate) : new Date();

    // Get all organizations with depreciation enabled
    const organizations = await prisma.organization.findMany({
      where: {
        depreciationEnabled: true,
      },
      select: { id: true, slug: true, name: true },
    });

    logger.info({ count: organizations.length }, 'Processing organizations');

    const results: {
      organizationSlug: string;
      organizationName: string;
      totalAssets: number;
      processed: number;
      skipped: number;
      failed: number;
      error?: string;
    }[] = [];

    for (const org of organizations) {
      try {
        const result = await runDepreciationForTenant(org.id, calculationDate);

        results.push({
          organizationSlug: org.slug,
          organizationName: org.name,
          totalAssets: result.totalAssets,
          processed: result.processed,
          skipped: result.skipped,
          failed: result.failed,
        });

        logger.debug({
          orgSlug: org.slug,
          processed: result.processed,
          skipped: result.skipped,
          failed: result.failed,
        }, 'Organization depreciation completed');
      } catch (error) {
        logger.error({
          orgSlug: org.slug,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Error processing organization depreciation');
        results.push({
          organizationSlug: org.slug,
          organizationName: org.name,
          totalAssets: 0,
          processed: 0,
          skipped: 0,
          failed: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate totals
    const totals = results.reduce(
      (acc, r) => ({
        organizations: acc.organizations + 1,
        totalAssets: acc.totalAssets + r.totalAssets,
        processed: acc.processed + r.processed,
        skipped: acc.skipped + r.skipped,
        failed: acc.failed + r.failed,
        errors: acc.errors + (r.error ? 1 : 0),
      }),
      { organizations: 0, totalAssets: 0, processed: 0, skipped: 0, failed: 0, errors: 0 }
    );

    logger.info({
      processed: totals.processed,
      skipped: totals.skipped,
      failed: totals.failed,
      organizations: totals.organizations,
    }, 'Monthly depreciation completed');

    return NextResponse.json({
      success: true,
      message: `Monthly depreciation completed`,
      calculationDate: calculationDate.toISOString(),
      summary: totals,
      details: results,
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Critical error in depreciation cron');
    return NextResponse.json(
      {
        error: 'Depreciation cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/depreciation - Health check and info endpoint
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Get counts of assets with depreciation configured
  const stats = await prisma.asset.groupBy({
    by: ['tenantId'],
    where: {
      depreciationCategoryId: { not: null },
      isFullyDepreciated: false,
      status: { not: 'DISPOSED' },
    },
    _count: true,
  });

  const orgIds = stats.map((s) => s.tenantId);
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, slug: true },
  });

  const orgMap = new Map(orgs.map((o) => [o.id, o.slug]));

  return NextResponse.json({
    status: 'ready',
    description: 'Monthly depreciation cron job',
    schedule: 'Recommended: 5 0 1 * * (1st of each month at 00:05 UTC)',
    assetsWithDepreciation: stats.map((s) => ({
      organizationSlug: orgMap.get(s.tenantId) || s.tenantId,
      assetCount: s._count,
    })),
    totalAssets: stats.reduce((acc, s) => acc + s._count, 0),
  });
}
