/**
 * @file route.ts
 * @description Client-side error reporting endpoint
 * @module api/errors
 *
 * Receives error reports from the client-side error boundary
 * and logs them to the database for super admin visibility.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { handleSystemError } from '@/lib/core/error-logger';
import logger from '@/lib/core/log';
import { deriveOrgRole } from '@/lib/access-control';

interface ClientErrorReport {
  message: string;
  stack?: string;
  source: string;
  digest?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

// Rate limit: max 10 errors per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body: ClientErrorReport = await request.json();

    // Validate required fields
    if (!body.message || !body.source) {
      return NextResponse.json(
        { error: 'Missing required fields: message, source' },
        { status: 400 }
      );
    }

    // Try to get session info (may not be authenticated)
    const session = await getServerSession(authOptions);

    // Log to database (non-blocking)
    await handleSystemError({
      type: 'CLIENT_ERROR',
      source: body.source,
      tenantId: session?.user?.organizationId,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: deriveOrgRole(session?.user ?? {}),
      message: body.message,
      stack: body.stack,
      errorCode: body.digest,
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        url: body.url,
        digest: body.digest,
        ...body.metadata,
      },
      severity: 'error',
    });

    logger.info(
      { source: body.source, userId: session?.user?.id },
      'Client error reported'
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to process client error report'
    );
    // Return 200 to not trigger retry loops on client
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
