import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';

/**
 * Cron job to permanently delete users whose scheduled deletion date has passed.
 * This runs daily and cleans up soft-deleted users after the 7-day recovery period.
 *
 * Schedule: Daily at 2 AM UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
    });

    if (usersToDelete.length === 0) {
      return NextResponse.json({
        message: 'No users to delete',
        deletedCount: 0,
      });
    }

    const results: { success: string[]; failed: { id: string; email: string; error: string }[] } = {
      success: [],
      failed: [],
    };

    // Delete each user
    for (const user of usersToDelete) {
      try {
        // Skip if user still has assigned assets or subscriptions (shouldn't happen but safety check)
        if (user._count.assets > 0 || user._count.subscriptions > 0) {
          results.failed.push({
            id: user.id,
            email: user.email,
            error: `Still has ${user._count.assets} assets and ${user._count.subscriptions} subscriptions assigned`,
          });
          continue;
        }

        // Permanently delete the user
        await prisma.user.delete({
          where: { id: user.id },
        });

        results.success.push(user.email);
        console.log(`[Cleanup] Permanently deleted user: ${user.email} (${user.id})`);
      } catch (error) {
        console.error(`[Cleanup] Failed to delete user ${user.email}:`, error);
        results.failed.push({
          id: user.id,
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Cleanup complete`,
      deletedCount: results.success.length,
      failedCount: results.failed.length,
      results,
    });
  } catch (error) {
    console.error('[Cleanup] Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cleanup job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
