/**
 * @module api/chat
 * @description AI chat API with conversation management.
 *
 * Provides the main chat interface for AI-powered conversations with full
 * security controls including rate limiting, input sanitization, and audit logging.
 * Supports conversation CRUD operations with proper authorization.
 *
 * @route POST /api/chat - Send message and get AI response
 * @route GET /api/chat - List conversations or get conversation messages
 * @route DELETE /api/chat - Delete a conversation
 *
 * @security
 * - Requires authentication for all endpoints
 * - Organization-level AI chat enable/disable check
 * - Multi-tier rate limiting (per-user, per-org, concurrent)
 * - Input sanitization for prompt injection prevention
 * - CSRF verification on DELETE operations
 * - Audit logging with token usage tracking
 *
 * @ratelimits
 * - Per-user: Based on subscription tier
 * - Per-org: Monthly token budget
 * - Concurrent: Max 3 simultaneous requests per user
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/http/errors';
import { invalidBodyResponse } from '@/lib/http/responses';
import logger from '@/lib/core/log';
import { processChat, getConversations, getConversationMessages, deleteConversation } from '@/lib/ai/chat-service';
import { sanitizeInput, shouldBlockInput, formatSanitizationLog } from '@/lib/ai/input-sanitizer';
import {
  checkAIRateLimit,
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
        rateLimitInfo: {
          reason: 'concurrent_limit',
          current: 3,
          limit: 3,
        },
      },
      { status: 429 }
    );
  }

  try {
    // Check if AI chat is enabled for this organization
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { aiChatEnabled: true, subscriptionTier: true },
    });

    if (!org?.aiChatEnabled) {
      return forbiddenResponse('AI chat is not enabled for your organization. Please contact your administrator.');
    }

    // Check rate limits
    const rateLimitResult = await checkAIRateLimit(
      userId,
      tenantId,
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
      return invalidBodyResponse(validation.error);
    }

    const { message, conversationId } = validation.data;

    // Check if input should be blocked entirely
    const blockCheck = shouldBlockInput(message);
    if (blockCheck.blocked) {
      logger.warn({ userId, reason: blockCheck.reason }, 'AI Chat: Blocked message');
      return badRequestResponse('Your message could not be processed. Please rephrase and try again.');
    }

    // Sanitize input for prompt injection prevention
    const sanitizationResult = sanitizeInput(message);

    // Log flagged messages for security monitoring
    if (sanitizationResult.flagged) {
      logger.warn(
        { userId, sanitizationDetails: formatSanitizationLog(sanitizationResult) },
        'AI Chat: Flagged message'
      );
    }

    // Track response time
    const startTime = Date.now();

    // Map isAdmin to Role for chat context
    // ADMINs get DIRECTOR level (highest approval role) for AI permissions
    const userRole: Role = isAdmin ? Role.DIRECTOR : Role.EMPLOYEE;

    const response = await processChat(sanitizationResult.sanitized, {
      userId,
      userRole,
      tenantId,
      tenantSlug,
    }, conversationId || undefined);

    const responseTimeMs = Date.now() - startTime;

    // Estimate tokens from response (approximate)
    const estimatedTokens = Math.ceil(
      (sanitizationResult.sanitized.length + response.message.length) / 4
    );

    // Log audit entry (fire and forget, but log failures)
    const auditEntry = createAuditEntry(
      { tenantId, memberId: userId },
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
      tenantId,
      org.subscriptionTier || SubscriptionTier.FREE,
      estimatedTokens
    ).catch((err) => {
      console.error('[AI Budget] Failed to track token usage:', err instanceof Error ? err.message : String(err));
    });

    return NextResponse.json(response);
  } finally {
    // Always release concurrent slot when request completes
    releaseConcurrentSlot(userId);
  }
}, { requireAuth: true });

/**
 * GET /api/chat - Get conversation list or messages
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const userId = tenant!.userId;
  const tenantId = tenant!.tenantId;

  // Check rate limit for read operations
  const rateLimitResult = await checkReadRateLimit(userId, tenantId);

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
    const conversation = await getConversationMessages(conversationId, userId, {
      cursor,
      limit,
    });
    if (!conversation) {
      return notFoundResponse('Conversation not found');
    }
    return NextResponse.json(conversation);
  } else {
    // Get list of conversations
    const conversations = await getConversations(userId, tenantId);
    return NextResponse.json({ conversations });
  }
}, { requireAuth: true });

/**
 * DELETE /api/chat - Delete a conversation
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const userId = tenant!.userId;

  // Verify CSRF for state-changing operations
  if (!verifyCsrf(request)) {
    return forbiddenResponse('Invalid request origin');
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return badRequestResponse('conversationId required');
  }

  const deleted = await deleteConversation(conversationId, userId);
  if (!deleted) {
    return notFoundResponse('Conversation not found');
  }

  return NextResponse.json({ success: true });
}, { requireAuth: true });

/* =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * OVERVIEW:
 * Main AI chat API providing conversation management with comprehensive
 * security controls. Supports message sending, conversation listing, and
 * deletion with full audit trail.
 *
 * SECURITY ASSESSMENT: GOOD
 * - Authentication required for all endpoints
 * - Multi-tier rate limiting (user, org, concurrent)
 * - Input sanitization prevents prompt injection
 * - CSRF verification on DELETE operations
 * - Audit logging with token tracking
 * - Organization-level AI enable/disable control
 *
 * POTENTIAL IMPROVEMENTS:
 * 1. Add message encryption at rest
 * 2. Content moderation for AI responses
 * 3. Rate limit headers in all responses (not just 429)
 * 4. Webhook notifications for admin audit alerts
 *
 * RATE LIMIT TIERS:
 * - Per-user: Based on subscription tier
 * - Per-org: Monthly token budget
 * - Concurrent: Max 3 simultaneous requests
 *
 * DEPENDENCIES:
 * - @/lib/ai/chat-service: Core chat processing
 * - @/lib/ai/input-sanitizer: Prompt injection prevention
 * - @/lib/ai/rate-limiter: Multi-tier rate limiting
 * - @/lib/ai/audit-logger: Security audit trail
 * - @/lib/ai/budget-tracker: Token usage monitoring
 *
 * LAST REVIEWED: 2026-02-01
 * ============================================================================= */
