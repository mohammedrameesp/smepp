/**
 * @file route.ts
 * @description Cron job to permanently delete assets after 7-day retention period
 * @module api/cron/cleanup-deleted-assets
 *
 * @todo Add to vercel.json crons array:
 * {
 *   "path": "/api/cron/cleanup-deleted-assets",
 *   "schedule": "0 3 * * *"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { verifyCronAuth } from '@/lib/security/cron-auth';

const RETENTION_DAYS = 7;

/**
 * Cron job to permanently delete assets whose deletion date has passed the 7-day recovery period.
 * This runs daily and cleans up soft-deleted assets.
 *
 * Schedule: Daily at 3 AM UTC (configure in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify cron secret using timing-safe comparison
    const authResult = verifyCronAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Authentication required', details: authResult.error }, { status: 401 });
    }

    // Calculate cutoff date (7 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    // Find all assets whose deletion date is older than retention period
    const assetsToDelete = await prisma.asset.findMany({
      where: {
        deletedAt: {
          not: null,
          lte: cutoffDate,
        },
      },
      select: {
        id: true,
        assetTag: true,
        model: true,
        type: true,
        tenantId: true,
        deletedAt: true,
      },
    });

    if (assetsToDelete.length === 0) {
      return NextResponse.json({
        message: 'No assets to permanently delete',
        deletedCount: 0,
      });
    }

    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    // Delete each asset
    for (const asset of assetsToDelete) {
      try {
        // Permanently delete the asset (cascades to history, maintenance, etc.)
        await prisma.asset.delete({
          where: { id: asset.id },
        });

        results.success.push(asset.id);
        logger.info({
          assetId: asset.id,
          assetTag: asset.assetTag,
          tenantId: asset.tenantId,
          deletedAt: asset.deletedAt,
        }, 'Permanently deleted asset after retention period');
      } catch (error) {
        logger.error({
          assetId: asset.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to permanently delete asset');
        results.failed.push({
          id: asset.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info({
      deletedCount: results.success.length,
      failedCount: results.failed.length,
      retentionDays: RETENTION_DAYS,
    }, 'Asset cleanup completed');

    return NextResponse.json({
      message: 'Cleanup complete',
      deletedCount: results.success.length,
      failedCount: results.failed.length,
      retentionDays: RETENTION_DAYS,
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Asset cleanup cron job failed');
    return NextResponse.json(
      { error: 'Cleanup job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
