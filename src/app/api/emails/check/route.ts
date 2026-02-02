/**
 * @module api/emails/check
 * @description Public endpoint for checking email availability during signup.
 *
 * Validates email format and checks if the email is already registered globally.
 * Used for real-time feedback in signup forms before form submission.
 *
 * NOTE: Uses raw prisma (not tenant-scoped) because:
 * 1. Public endpoint for signup - no authentication
 * 2. User table is global (users can belong to multiple organizations)
 * 3. Email uniqueness must be checked across all users, not per-tenant
 *
 * @authentication None - Public endpoint
 * @ratelimit None configured - consider adding for enumeration prevention
 *
 * @example
 * GET /api/emails/check?email=user@example.com
 * Response: { "email": "user@example.com", "available": true, "valid": true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { VALIDATION_PATTERNS } from '@/lib/validations/patterns';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  // Validate email format
  if (!VALIDATION_PATTERNS.email.test(email)) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        error: 'Please enter a valid email address',
      },
      { status: 200 }
    );
  }

  // Check if email already exists (case-insensitive)
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: email.toLowerCase(),
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  return NextResponse.json(
    {
      email: email.toLowerCase(),
      available: !existingUser,
      valid: true,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STRENGTHS:
 * - Validates email format before database query
 * - Case-insensitive email lookup (mode: 'insensitive')
 * - Proper no-cache headers prevent stale availability info
 * - Minimal data selected from DB (only id)
 * - Clear documentation of why raw prisma is used
 *
 * CONCERNS:
 * - No rate limiting (email enumeration attack vector)
 * - Returns whether email exists (privacy concern)
 * - Invalid email returns 200 (should be 400)
 * - No protection against automated scraping
 *
 * RECOMMENDATIONS:
 * - Add strict rate limiting (e.g., 10 requests per IP per minute)
 * - Consider always returning "available" after signup completes
 * - Add CAPTCHA for repeated requests
 * - Log requests for security monitoring
 * - Consider timing-safe response to prevent timing attacks
 *
 * SECURITY NOTES:
 * - Email enumeration possible without rate limiting
 * - No authentication required (by design for signup)
 * - Pattern validation prevents malformed queries
 */
