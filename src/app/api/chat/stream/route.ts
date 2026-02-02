/**
 * @module api/chat/stream
 * @description Streaming AI chat endpoint using Server-Sent Events (SSE).
 *
 * Provides real-time streaming responses from the AI model, allowing
 * progressive display of responses in the UI. Implements the same
 * security controls as the non-streaming chat endpoint.
 *
 * @route POST /api/chat/stream - Send message and get streaming AI response
 *
 * @security
 * - Requires authentication
 * - Organization-level AI chat enable/disable check
 * - Multi-tier rate limiting (per-user, per-org, concurrent)
 * - Input sanitization for prompt injection prevention
 * - Audit logging with token usage tracking
 *
 * @streaming
 * - Uses Server-Sent Events (SSE) format
 * - Event types: chunk (partial content), done (completion), error
 * - Concurrent slot released in finally block to prevent leaks
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { forbiddenResponse } from '@/lib/http/errors';
import { invalidBodyResponse } from '@/lib/http/responses';
import logger from '@/lib/core/log';
import { processChatStream } from '@/lib/ai/chat-service';
import { sanitizeInput, shouldBlockInput, formatSanitizationLog } from '@/lib/ai/input-sanitizer';
import {
  checkAIRateLimit,
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
export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const userId = tenant!.userId;
  const tenantId = tenant!.tenantId;
  const tenantSlug = tenant!.tenantSlug || '';
  const isAdmin = tenant!.isAdmin;

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
    where: { id: tenantId },
    select: { aiChatEnabled: true, subscriptionTier: true },
  });

  if (!org?.aiChatEnabled) {
    releaseConcurrentSlot(userId);
    return forbiddenResponse('AI chat is not enabled for your organization. Please contact your administrator.');
  }

  // Check rate limits
  const rateLimitResult = await checkAIRateLimit(
    userId,
    tenantId,
    org.subscriptionTier || SubscriptionTier.FREE
  );

  if (!rateLimitResult.allowed) {
    releaseConcurrentSlot(userId);
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
    releaseConcurrentSlot(userId);
    return NextResponse.json(
      { error: 'AI chat is not configured. Please add OPENAI_API_KEY.' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const validation = sendMessageSchema.safeParse(body);

  if (!validation.success) {
    releaseConcurrentSlot(userId);
    return invalidBodyResponse(validation.error);
  }

  const { message, conversationId } = validation.data;

  // Check if input should be blocked entirely
  const blockCheck = shouldBlockInput(message);
  if (blockCheck.blocked) {
    releaseConcurrentSlot(userId);
    logger.warn({ userId, reason: blockCheck.reason }, 'AI Chat: Blocked message');
    return NextResponse.json(
      { error: 'Your message could not be processed. Please rephrase and try again.' },
      { status: 400 }
    );
  }

  // Sanitize input for prompt injection prevention
  const sanitizationResult = sanitizeInput(message);

  if (sanitizationResult.flagged) {
    logger.warn(
      { userId, sanitizationDetails: formatSanitizationLog(sanitizationResult) },
      'AI Chat: Flagged message'
    );
  }

  const startTime = Date.now();

  // Map isAdmin to Role for chat context
  // ADMINs get DIRECTOR level (highest approval role) for AI permissions
  const userRole: Role = isAdmin ? Role.DIRECTOR : Role.EMPLOYEE;

  const subscriptionTier = org.subscriptionTier || SubscriptionTier.FREE;

  // Create the streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chatStream = processChatStream(sanitizationResult.sanitized, {
          userId,
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
            { tenantId, memberId: userId },
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
        releaseConcurrentSlot(userId);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}, { requireAuth: true });

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * Streaming AI chat endpoint using Server-Sent Events (SSE) for real-time
 * response delivery. Mirrors security controls of the non-streaming endpoint.
 *
 * SECURITY ASSESSMENT: GOOD
 * - Same security controls as /api/chat (auth, rate limits, sanitization)
 * - Concurrent slot properly released in finally block
 * - Error events sent to client before stream close
 * - Audit logging after stream completion
 *
 * POTENTIAL IMPROVEMENTS:
 * 1. Add heartbeat/keepalive for long connections
 * 2. Consider WebSocket upgrade for bidirectional streaming
 * 3. Add client-side reconnection guidance in error events
 * 4. Stream timeout handling for stalled connections
 *
 * SSE EVENT TYPES:
 * - chunk: Partial content from AI model
 * - done: Stream complete with conversation ID
 * - error: Error occurred during processing
 *
 * DEPENDENCIES:
 * - @/lib/ai/chat-service: processChatStream generator
 * - @/lib/ai/input-sanitizer: Prompt injection prevention
 * - @/lib/ai/rate-limiter: Multi-tier rate limiting
 * - @/lib/ai/audit-logger: Security audit trail
 * - @/lib/ai/budget-tracker: Token usage monitoring
 *
 * LAST REVIEWED: 2026-02-01
 * ============================================================================= */
