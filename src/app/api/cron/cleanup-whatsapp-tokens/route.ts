/**
 * @file route.ts
 * @description Cron job to clean up expired WhatsApp action tokens
 * @module api/cron/cleanup-whatsapp-tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/core/log';
import { verifyCronAuth } from '@/lib/security/cron-auth';
import { cleanupExpiredTokens } from '@/lib/whatsapp';

/**
 * Cron job to clean up expired WhatsApp action tokens.
 * Removes:
 * - Tokens that have expired (past expiresAt)
 * - Used tokens older than 24 hours
 *
 * Schedule: Daily at 3 AM UTC (configured in vercel.json)
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify cron secret using timing-safe comparison
    const authResult = verifyCronAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required', details: authResult.error },
        { status: 401 }
      );
    }

    const deletedCount = await cleanupExpiredTokens();

    logger.info({ deletedCount }, 'WhatsApp token cleanup completed');

    return NextResponse.json({
      success: true,
      message: 'WhatsApp token cleanup complete',
      deletedCount,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'WhatsApp token cleanup cron job failed'
    );
    return NextResponse.json(
      {
        error: 'Cleanup job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
