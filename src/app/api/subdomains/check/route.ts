/**
 * @module api/subdomains/check
 * @description Public endpoint for checking subdomain availability during signup.
 *
 * Validates slug format (alphanumeric, hyphens, length constraints) and checks
 * against existing organizations and reserved subdomains. Used for real-time
 * feedback in the organization signup form.
 *
 * @authentication None - Public endpoint
 * @ratelimit None configured - consider adding for abuse prevention
 *
 * @example
 * GET /api/subdomains/check?slug=acme
 * Response: { "slug": "acme", "available": true, "valid": true }
 *
 * GET /api/subdomains/check?slug=www
 * Response: { "available": false, "valid": false, "error": "This subdomain is reserved" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSlug, isSlugAvailable } from '@/lib/multi-tenant/subdomain';
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json(
      { error: 'Slug parameter is required' },
      { status: 400 }
    );
  }

  // Validate slug format
  const validation = validateSlug(slug);
  if (!validation.valid) {
    return NextResponse.json(
      {
        available: false,
        valid: false,
        error: validation.error,
      },
      { status: 200 }
    );
  }

  // Check availability
  const available = await isSlugAvailable(slug);

  return NextResponse.json(
    {
      slug: slug.toLowerCase(),
      available,
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
 * - Validates slug format before database query
 * - Returns consistent response shape for all scenarios
 * - Proper no-cache headers prevent stale availability info
 * - Case normalization for consistent slug handling
 * - Simple and focused endpoint
 *
 * CONCERNS:
 * - No rate limiting (could be used for subdomain enumeration)
 * - No input length validation before validateSlug
 * - Error responses return 200 status (non-standard for errors)
 *
 * RECOMMENDATIONS:
 * - Add rate limiting (e.g., 30 requests per IP per minute)
 * - Consider returning 400 for invalid slugs instead of 200
 * - Add request logging for analytics
 * - Consider debouncing guidance in API response
 *
 * SECURITY NOTES:
 * - Slug validation prevents injection attacks
 * - No sensitive data exposed
 * - Reserved subdomain protection via validateSlug
 */
