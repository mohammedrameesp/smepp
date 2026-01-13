import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

/**
 * Verify cron job authentication
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer') return false;

  return token === process.env.CRON_SECRET;
}

/**
 * POST /api/cron/chat-cleanup - Clean up expired chat conversations
 *
 * This cron job:
 * 1. Deletes conversations that have passed their expiresAt date
 * 2. Applies default retention (90 days) to conversations without expiresAt
 * 3. Cleans up old audit logs (keeps flagged entries longer)
 */
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const now = new Date();
    const defaultRetentionDays = parseInt(process.env.CHAT_RETENTION_DAYS || '90', 10);
    const defaultCutoff = new Date(now.getTime() - defaultRetentionDays * 24 * 60 * 60 * 1000);

    // 1. Delete conversations that have explicit expiresAt and have expired
    const expiredResult = await prisma.chatConversation.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });

    // 2. Delete conversations without expiresAt that are older than default retention
    const oldConversationsResult = await prisma.chatConversation.deleteMany({
      where: {
        expiresAt: null,
        createdAt: {
          lt: defaultCutoff,
        },
      },
    });

    // 3. Clean up audit logs (90 days for non-flagged, keep flagged longer)
    const auditCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const auditResult = await prisma.aIChatAuditLog.deleteMany({
      where: {
        createdAt: {
          lt: auditCutoff,
        },
        flagged: false, // Keep flagged entries for longer review
      },
    });

    // 4. Clean up very old flagged audit logs (1 year)
    const flaggedCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const flaggedAuditResult = await prisma.aIChatAuditLog.deleteMany({
      where: {
        createdAt: {
          lt: flaggedCutoff,
        },
        flagged: true,
      },
    });

    const summary = {
      expiredConversationsDeleted: expiredResult.count,
      oldConversationsDeleted: oldConversationsResult.count,
      auditLogsDeleted: auditResult.count,
      flaggedAuditLogsDeleted: flaggedAuditResult.count,
      defaultRetentionDays,
      timestamp: now.toISOString(),
    };

    logger.info(summary, 'Chat cleanup completed');

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Chat cleanup failed'
    );
    return NextResponse.json(
      { error: 'Chat cleanup failed' },
      { status: 500 }
    );
  }
}

// Also support GET for manual triggering in development
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Use POST in production' }, { status: 405 });
  }
  return POST(request);
}
