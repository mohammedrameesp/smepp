/**
 * @file route.ts
 * @description Cron job to permanently delete users after retention period
 * @module api/cron/cleanup-deleted-users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

/**
 * Cron job to permanently delete users whose scheduled deletion date has passed.
 * This runs daily and cleans up soft-deleted users after the 7-day recovery period.
 *
 * Schedule: Daily at 2 AM UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    // SECURITY: Require CRON_SECRET to be set AND match - never allow unauthenticated access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const now = new Date();

    // Find all users whose scheduled deletion date has passed
    const usersToDelete = await prisma.user.findMany({
      where: {
        isDeleted: true,
        scheduledDeletionAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        scheduledDeletionAt: true,
      },
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({
        message: 'No users to delete',
        deletedCount: 0,
      });
    }

    const results: { success: string[]; failed: { id: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    // Delete each user
    for (const user of usersToDelete) {
      try {
        // Permanently delete the user
        // Note: Assets/subscriptions are now linked to TeamMember, not User
        await prisma.user.delete({
          where: { id: user.id },
        });

        results.success.push(user.id);
        logger.debug({ userId: user.id }, 'Permanently deleted user');
      } catch (error) {
        logger.error({
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Failed to delete user');
        results.failed.push({
          id: user.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info({
      deletedCount: results.success.length,
      failedCount: results.failed.length,
    }, 'User cleanup completed');

    return NextResponse.json({
      message: `Cleanup complete`,
      deletedCount: results.success.length,
      failedCount: results.failed.length,
    });
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Cleanup cron job failed');
    return NextResponse.json(
      { error: 'Cleanup job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
