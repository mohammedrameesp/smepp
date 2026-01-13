import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { createHash } from 'crypto';

/**
 * POST /api/chat/gdpr-delete - Delete all chat data for the current user (GDPR compliance)
 *
 * This endpoint:
 * 1. Deletes all chat conversations and messages for the user
 * 2. Anonymizes audit logs (replaces memberId with hash)
 * 3. Returns confirmation of deleted data
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const userId = session.user.id;
    const tenantId = session.user.organizationId;

    // 1. Count data before deletion (for confirmation)
    const conversationCount = await prisma.chatConversation.count({
      where: { memberId: userId, tenantId },
    });

    const messageCount = await prisma.chatMessage.count({
      where: {
        conversation: {
          memberId: userId,
          tenantId,
        },
      },
    });

    const auditLogCount = await prisma.aIChatAuditLog.count({
      where: { memberId: userId, tenantId },
    });

    // 2. Delete all conversations (messages cascade delete)
    await prisma.chatConversation.deleteMany({
      where: { memberId: userId, tenantId },
    });

    // 3. Anonymize audit logs (replace memberId with a hash to preserve analytics)
    // We keep the audit logs for security monitoring but remove PII
    const anonymizedMemberId = createHash('sha256')
      .update(`deleted-user-${userId}-${Date.now()}`)
      .digest('hex')
      .slice(0, 25); // Keep it short

    await prisma.aIChatAuditLog.updateMany({
      where: { memberId: userId, tenantId },
      data: {
        memberId: anonymizedMemberId,
        ipAddress: null, // Remove IP address
        userAgent: null, // Remove user agent
      },
    });

    const result = {
      success: true,
      deletedData: {
        conversations: conversationCount,
        messages: messageCount,
        auditLogsAnonymized: auditLogCount,
      },
      timestamp: new Date().toISOString(),
    };

    logger.info(
      { userId, tenantId, ...result.deletedData },
      'GDPR chat data deletion completed'
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'GDPR chat data deletion failed'
    );
    return NextResponse.json(
      { error: 'Failed to delete chat data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/gdpr-delete - Get a preview of data that would be deleted
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const userId = session.user.id;
    const tenantId = session.user.organizationId;

    // Count all data that would be affected
    const conversationCount = await prisma.chatConversation.count({
      where: { memberId: userId, tenantId },
    });

    const messageCount = await prisma.chatMessage.count({
      where: {
        conversation: {
          memberId: userId,
          tenantId,
        },
      },
    });

    const auditLogCount = await prisma.aIChatAuditLog.count({
      where: { memberId: userId, tenantId },
    });

    // Get date range of data
    const oldestConversation = await prisma.chatConversation.findFirst({
      where: { memberId: userId, tenantId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const newestConversation = await prisma.chatConversation.findFirst({
      where: { memberId: userId, tenantId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return NextResponse.json({
      preview: true,
      dataToDelete: {
        conversations: conversationCount,
        messages: messageCount,
        auditLogsToAnonymize: auditLogCount,
      },
      dateRange: {
        oldest: oldestConversation?.createdAt || null,
        newest: newestConversation?.createdAt || null,
      },
      warning: 'This action is irreversible. All your chat conversations and messages will be permanently deleted.',
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'GDPR preview failed'
    );
    return NextResponse.json(
      { error: 'Failed to get data preview' },
      { status: 500 }
    );
  }
}
