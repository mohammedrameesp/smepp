import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { processChat, getConversations, getConversationMessages, deleteConversation } from '@/lib/ai/chat-service';
import { sanitizeInput, shouldBlockInput, formatSanitizationLog } from '@/lib/ai/input-sanitizer';
import { checkRateLimit, formatRateLimitError } from '@/lib/ai/rate-limiter';
import { createAuditEntry, logAuditEntry } from '@/lib/ai/audit-logger';
import { trackTokenUsage } from '@/lib/ai/budget-tracker';
import { SubscriptionTier, Role } from '@prisma/client';
import { z } from 'zod';

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().nullish(), // Accept null, undefined, or string
});

/**
 * POST /api/chat - Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Check if AI chat is enabled for this organization
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { aiChatEnabled: true, subscriptionTier: true },
    });

    if (!org?.aiChatEnabled) {
      return NextResponse.json(
        { error: 'AI chat is not enabled for your organization. Please contact your administrator.' },
        { status: 403 }
      );
    }

    // Check rate limits
    const rateLimitResult = await checkRateLimit(
      session.user.id,
      session.user.organizationId,
      org.subscriptionTier || SubscriptionTier.FREE
    );

    if (!rateLimitResult.allowed) {
      const errorMessage = formatRateLimitError(rateLimitResult);
      return NextResponse.json(
        {
          error: errorMessage,
          rateLimitInfo: {
            reason: rateLimitResult.reason,
            current: rateLimitResult.current,
            limit: rateLimitResult.limit,
            resetAt: rateLimitResult.resetAt?.toISOString(),
            retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          },
        },
        {
          status: 429,
          headers: rateLimitResult.retryAfterSeconds
            ? { 'Retry-After': String(rateLimitResult.retryAfterSeconds) }
            : undefined,
        }
      );
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'AI chat is not configured. Please add OPENAI_API_KEY.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { message, conversationId } = validation.data;

    // Check if input should be blocked entirely
    const blockCheck = shouldBlockInput(message);
    if (blockCheck.blocked) {
      console.warn(`[AI Chat] Blocked message from user ${session.user.id}: ${blockCheck.reason}`);
      return NextResponse.json(
        { error: 'Your message could not be processed. Please rephrase and try again.' },
        { status: 400 }
      );
    }

    // Sanitize input for prompt injection prevention
    const sanitizationResult = sanitizeInput(message);

    // Log flagged messages for security monitoring
    if (sanitizationResult.flagged) {
      console.warn(
        `[AI Chat] Flagged message from user ${session.user.id}: ${formatSanitizationLog(sanitizationResult)}`
      );
    }

    // Track response time
    const startTime = Date.now();

    // Map TeamMemberRole to Role for chat context
    const userRole: Role = session.user.teamMemberRole === 'ADMIN'
      ? Role.ADMIN
      : session.user.role || Role.EMPLOYEE;

    const response = await processChat(sanitizationResult.sanitized, {
      userId: session.user.id,
      userRole,
      tenantId: session.user.organizationId,
      tenantSlug: session.user.organizationSlug || '',
    }, conversationId || undefined);

    const responseTimeMs = Date.now() - startTime;

    // Estimate tokens from response (approximate)
    const estimatedTokens = Math.ceil(
      (sanitizationResult.sanitized.length + response.message.length) / 4
    );

    // Log audit entry (fire and forget)
    const auditEntry = createAuditEntry(
      { tenantId: session.user.organizationId, memberId: session.user.id },
      message, // Original message for hashing
      response.conversationId,
      response.functionCalls,
      estimatedTokens,
      responseTimeMs,
      sanitizationResult,
      {
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      }
    );
    logAuditEntry(auditEntry).catch(() => {}); // Non-blocking

    // Track budget and send alerts if needed (fire and forget)
    trackTokenUsage(
      session.user.organizationId,
      org.subscriptionTier || SubscriptionTier.FREE,
      estimatedTokens
    ).catch(() => {}); // Non-blocking

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat - Get conversation list or messages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (conversationId) {
      // Get messages for a specific conversation
      const conversation = await getConversationMessages(conversationId, session.user.id);
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return NextResponse.json(conversation);
    } else {
      // Get list of conversations
      const conversations = await getConversations(session.user.id, session.user.organizationId);
      return NextResponse.json({ conversations });
    }
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat data' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat - Delete a conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const deleted = await deleteConversation(conversationId, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
