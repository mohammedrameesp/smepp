import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { RESERVED_SUBDOMAINS } from '@/lib/multi-tenant/subdomain';
import type { TenantBranding, TenantBrandingResponse } from '@/lib/types/tenant-branding';
import logger from '@/lib/core/log';

/**
 * GET /api/public/tenant-branding?subdomain=acme
 *
 * Public endpoint to fetch organization branding for login pages.
 * No authentication required.
 */
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
    if (RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase())) {
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
