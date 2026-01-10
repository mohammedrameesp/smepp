import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { processChatStream } from '@/lib/ai/chat-service';
import { sanitizeInput, shouldBlockInput, formatSanitizationLog } from '@/lib/ai/input-sanitizer';
import {
  checkRateLimit,
  formatRateLimitError,
  acquireConcurrentSlot,
  releaseConcurrentSlot,
} from '@/lib/ai/rate-limiter';
import { createAuditEntry, logAuditEntry } from '@/lib/ai/audit-logger';
import { trackTokenUsage } from '@/lib/ai/budget-tracker';
import { SubscriptionTier, Role } from '@prisma/client';
import { z } from 'zod';

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().nullish(),
});

/**
 * POST /api/chat/stream - Send a message and get streaming AI response
 */
export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    userId = session.user.id;

    // Check concurrent request limit
    if (!acquireConcurrentSlot(userId)) {
      return NextResponse.json(
        {
          error: 'Too many simultaneous requests. Please wait for your current requests to complete.',
          rateLimitInfo: { reason: 'concurrent_limit', current: 3, limit: 3 },
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

    if (sanitizationResult.flagged) {
      logger.warn(
        { userId: session.user.id, sanitizationDetails: formatSanitizationLog(sanitizationResult) },
        'AI Chat: Flagged message'
      );
    }

    const startTime = Date.now();

    // Map TeamMemberRole to Role for chat context
    const userRole: Role = session.user.teamMemberRole === 'ADMIN'
      ? Role.ADMIN
      : session.user.role || Role.EMPLOYEE;

    // Store values needed in the stream callback (TypeScript can't carry narrowed types into closures)
    const sessionUserId = session.user.id;
    const tenantId = session.user.organizationId;
    const tenantSlug = session.user.organizationSlug || '';
    const subscriptionTier = org.subscriptionTier || SubscriptionTier.FREE;

    // Create the streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatStream = processChatStream(sanitizationResult.sanitized, {
            userId: sessionUserId,
            userRole,
            tenantId,
            tenantSlug,
          }, conversationId || undefined);

          let finalConversationId: string | undefined;
          let functionCalls: Array<{ name: string; args: Record<string, unknown>; result: unknown }> | undefined;

          for await (const event of chatStream) {
            if (event.type === 'chunk' && event.content) {
              // Send each chunk as a Server-Sent Event
              const data = JSON.stringify({ type: 'chunk', content: event.content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'done') {
              finalConversationId = event.conversationId;
              functionCalls = event.functionCalls;
              const data = JSON.stringify({ type: 'done', conversationId: event.conversationId, functionCalls: event.functionCalls });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            } else if (event.type === 'error') {
              const data = JSON.stringify({ type: 'error', content: event.content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          const responseTimeMs = Date.now() - startTime;
          const estimatedTokens = Math.ceil(sanitizationResult.sanitized.length / 4);

          // Log audit entry
          if (finalConversationId) {
            const auditEntry = createAuditEntry(
              { tenantId, memberId: sessionUserId },
              message,
              finalConversationId,
              functionCalls,
              estimatedTokens,
              responseTimeMs,
              sanitizationResult,
              {
                ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || undefined,
                userAgent: request.headers.get('user-agent') || undefined,
              }
            );
            logAuditEntry(auditEntry).catch((err) => {
              console.error('[AI Audit] Failed to log audit entry:', err instanceof Error ? err.message : String(err));
            });

            trackTokenUsage(
              tenantId,
              subscriptionTier,
              estimatedTokens
            ).catch((err) => {
              console.error('[AI Budget] Failed to track token usage:', err instanceof Error ? err.message : String(err));
            });
          }

          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({ type: 'error', content: 'Stream error' });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
          logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Chat stream error');
        } finally {
          // Release concurrent slot
          if (userId) {
            releaseConcurrentSlot(userId);
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    // Release concurrent slot on error
    if (userId) {
      releaseConcurrentSlot(userId);
    }
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Chat stream error');
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
