import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { processChat, getConversations, getConversationMessages, deleteConversation } from '@/lib/ai/chat-service';
import { sanitizeInput, shouldBlockInput, formatSanitizationLog } from '@/lib/ai/input-sanitizer';
import {
  checkRateLimit,
  checkReadRateLimit,
  formatRateLimitError,
  acquireConcurrentSlot,
  releaseConcurrentSlot,
} from '@/lib/ai/rate-limiter';
import { createAuditEntry, logAuditEntry } from '@/lib/ai/audit-logger';
import { trackTokenUsage } from '@/lib/ai/budget-tracker';
import { SubscriptionTier, Role } from '@prisma/client';
import { z } from 'zod';

/**
 * Verify CSRF by checking Origin header matches expected domains
 */
function verifyCsrf(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Allow requests without Origin (e.g., same-origin fetch)
    return true;
  }

  // Get expected host from request
  const host = request.headers.get('host');
  if (!host) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    // Check if origin matches the host (accounting for subdomains)
    const hostBase = host.split(':')[0]; // Remove port
    const originHost = originUrl.hostname;

    // Allow if origin matches host or is a subdomain
    return originHost === hostBase || originHost.endsWith(`.${hostBase}`);
  } catch {
    return false;
  }
}

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().nullish(), // Accept null, undefined, or string
});

/**
 * POST /api/chat - Send a message and get AI response
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    userId = session.user.id;

    // Check concurrent request limit
    if (!acquireConcurrentSlot(userId)) {
      return NextResponse.json(
        {
          error: 'Too many simultaneous requests. Please wait for your current requests to complete.',
          rateLimitInfo: {
            reason: 'concurrent_limit',
            current: 3,
            limit: 3,
          },
        },
        { status: 429 }
      );
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
      logger.warn({ userId: session.user.id, reason: blockCheck.reason }, 'AI Chat: Blocked message');
      return NextResponse.json(
        { error: 'Your message could not be processed. Please rephrase and try again.' },
        { status: 400 }
      );
    }

    // Sanitize input for prompt injection prevention
    const sanitizationResult = sanitizeInput(message);

    // Log flagged messages for security monitoring
    if (sanitizationResult.flagged) {
      logger.warn(
        { userId: session.user.id, sanitizationDetails: formatSanitizationLog(sanitizationResult) },
        'AI Chat: Flagged message'
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

    // Log audit entry (fire and forget, but log failures)
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
    logAuditEntry(auditEntry).catch((err) => {
      // Log audit failures for visibility
      console.error('[AI Audit] Failed to log audit entry:', err instanceof Error ? err.message : String(err));
    });

    // Track budget and send alerts if needed (fire and forget)
    trackTokenUsage(
      session.user.organizationId,
      org.subscriptionTier || SubscriptionTier.FREE,
      estimatedTokens
    ).catch((err) => {
      console.error('[AI Budget] Failed to track token usage:', err instanceof Error ? err.message : String(err));
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Chat error');
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  } finally {
    // Always release concurrent slot when request completes
    if (userId) {
      releaseConcurrentSlot(userId);
    }
  }
}

/**
 * GET /api/chat - Get conversation list or messages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    // Check rate limit for read operations
    const rateLimitResult = await checkReadRateLimit(
      session.user.id,
      session.user.organizationId
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

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const cursor = searchParams.get('cursor') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    if (conversationId) {
      // Get messages for a specific conversation with pagination
      const conversation = await getConversationMessages(conversationId, session.user.id, {
        cursor,
        limit,
      });
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Chat GET error');
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
    // Verify CSRF for state-changing operations
    if (!verifyCsrf(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Chat DELETE error');
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
