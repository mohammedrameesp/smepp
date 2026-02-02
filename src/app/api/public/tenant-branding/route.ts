/**
 * @module api/public/tenant-branding
 * @description Public endpoint for fetching organization branding and auth configuration.
 *
 * Returns tenant-specific branding (logo, colors, welcome text) and authentication
 * settings (allowed methods, domain restrictions, custom OAuth status) for login pages.
 * Used by the login UI to customize appearance per organization subdomain.
 *
 * @authentication None - Public endpoint
 * @ratelimit None configured - consider adding for abuse prevention
 *
 * @example
 * GET /api/public/tenant-branding?subdomain=acme
 * Response: {
 *   "found": true,
 *   "branding": {
 *     "organizationName": "Acme Corp",
 *     "logoUrl": "https://...",
 *     "primaryColor": "#3B82F6",
 *     "hasCustomGoogleOAuth": true
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { RESERVED_SUBDOMAINS } from '@/lib/multi-tenant/subdomain';
import type { TenantBranding, TenantBrandingResponse } from '@/lib/multi-tenant/tenant-branding';
import logger from '@/lib/core/log';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    // Validate subdomain parameter
    if (!subdomain) {
      return NextResponse.json<TenantBrandingResponse>(
        { found: false, error: 'Subdomain parameter is required' },
        { status: 400 }
      );
    }

    // Check if subdomain is reserved
    if (RESERVED_SUBDOMAINS.has(subdomain.toLowerCase())) {
      return NextResponse.json<TenantBrandingResponse>(
        { found: false, error: 'Invalid subdomain' },
        { status: 400 }
      );
    }

    // Fetch organization by slug
    const org = await prisma.organization.findUnique({
      where: { slug: subdomain.toLowerCase() },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        logoUrlInverse: true,
        primaryColor: true,
        secondaryColor: true,
        loginBackgroundUrl: true,
        welcomeTitle: true,
        welcomeSubtitle: true,
        website: true,
        // Authentication configuration
        allowedAuthMethods: true,
        allowedEmailDomains: true,
        enforceDomainRestriction: true,
        // Custom OAuth configuration (check if properly configured)
        customGoogleClientId: true,
        customGoogleClientSecret: true,
        customAzureClientId: true,
        customAzureClientSecret: true,
      },
    });

    if (!org) {
      return NextResponse.json<TenantBrandingResponse>(
        { found: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if OAuth is properly configured (both client ID and secret exist)
    const hasCustomGoogleOAuth = !!(org.customGoogleClientId && org.customGoogleClientSecret);
    const hasCustomAzureOAuth = !!(org.customAzureClientId && org.customAzureClientSecret);

    return NextResponse.json<TenantBrandingResponse>({
      found: true,
      branding: {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        logoUrl: org.logoUrl,
        logoUrlInverse: org.logoUrlInverse,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        loginBackgroundUrl: org.loginBackgroundUrl,
        welcomeTitle: org.welcomeTitle,
        welcomeSubtitle: org.welcomeSubtitle,
        website: org.website,
        // Authentication configuration
        allowedAuthMethods: (org.allowedAuthMethods || []) as TenantBranding['allowedAuthMethods'],
        allowedEmailDomains: org.allowedEmailDomains || [],
        enforceDomainRestriction: org.enforceDomainRestriction || false,
        // OAuth configuration status (true only if properly configured with ID + secret)
        hasCustomGoogleOAuth,
        hasCustomAzureOAuth,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error fetching tenant branding');
    return NextResponse.json<TenantBrandingResponse>(
      { found: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STRENGTHS:
 * - Typed response using TenantBrandingResponse
 * - Reserved subdomain check prevents access to system routes
 * - OAuth secrets are not exposed (only boolean status returned)
 * - Comprehensive branding data including auth configuration
 * - Proper error handling with different status codes
 *
 * CONCERNS:
 * - No rate limiting (could be used for organization enumeration)
 * - No caching headers (could reduce DB load for popular subdomains)
 * - Fetches OAuth secrets from DB just to check existence
 * - organizationId is exposed in response (potential info leakage)
 *
 * RECOMMENDATIONS:
 * - Add rate limiting (e.g., 100 requests per IP per minute)
 * - Add Cache-Control headers for short-term caching (e.g., 5 minutes)
 * - Use EXISTS query for OAuth check instead of fetching secrets
 * - Consider removing organizationId from public response
 * - Add request logging for analytics
 *
 * SECURITY NOTES:
 * - OAuth secrets never returned to client
 * - Reserved subdomain protection
 * - No authentication required (by design for login pages)
 */
