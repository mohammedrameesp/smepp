/**
 * @module api/chat/gdpr-delete
 * @description GDPR-compliant chat data deletion endpoint.
 *
 * Provides users the ability to delete their chat history and anonymize
 * audit logs in compliance with GDPR Article 17 (Right to Erasure).
 * Supports both preview (GET) and deletion (POST) operations.
 *
 * @route GET /api/chat/gdpr-delete - Preview data that would be deleted
 * @route POST /api/chat/gdpr-delete - Execute deletion
 *
 * @security
 * - Requires authentication (withErrorHandler requireAuth)
 * - Tenant-scoped: only deletes data for current user in current org
 * - Audit logs anonymized (hashed memberId) rather than deleted
 * - IP address and user agent removed from audit logs
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
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
export const POST = withErrorHandler(async (_request: NextRequest, { tenant }) => {
  const userId = tenant!.userId;
  const tenantId = tenant!.tenantId;

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
}, { requireAuth: true });

/**
 * GET /api/chat/gdpr-delete - Get a preview of data that would be deleted
 */
export const GET = withErrorHandler(async (_request: NextRequest, { tenant }) => {
  const userId = tenant!.userId;
  const tenantId = tenant!.tenantId;

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
}, { requireAuth: true });

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * GDPR Article 17 (Right to Erasure) implementation for AI chat data.
 * Provides preview and deletion of user's chat history with audit log
 * anonymization for compliance.
 *
 * SECURITY ASSESSMENT: GOOD
 * - Requires authentication via withErrorHandler
 * - Tenant-scoped: users can only delete their own data
 * - Audit logs anonymized with SHA-256 hash, not deleted (preserves analytics)
 * - PII (IP address, user agent) properly removed from audit logs
 * - Deletion confirmation returned with counts
 *
 * POTENTIAL IMPROVEMENTS:
 * 1. Add confirmation token/2FA for deletion action
 * 2. Consider async deletion for large datasets
 * 3. Email notification when deletion completes
 * 4. Export before delete option (data portability)
 *
 * COMPLIANCE NOTES:
 * - Conversations and messages: Hard delete (cascade)
 * - Audit logs: Anonymized (hashed memberId, nulled PII)
 * - Retention: Immediate upon request
 *
 * DEPENDENCIES:
 * - @/lib/http/handler: withErrorHandler wrapper
 * - @/lib/core/prisma: Database access
 * - crypto: SHA-256 hashing for anonymization
 *
 * LAST REVIEWED: 2026-02-01
 * ============================================================================= */
