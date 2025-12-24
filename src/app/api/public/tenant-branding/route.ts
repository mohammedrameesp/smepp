import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { RESERVED_SUBDOMAINS } from '@/lib/multi-tenant/subdomain';
import type { TenantBrandingResponse } from '@/lib/types/tenant-branding';

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
        primaryColor: true,
        secondaryColor: true,
        loginBackgroundUrl: true,
        welcomeTitle: true,
        welcomeSubtitle: true,
      },
    });

    if (!org) {
      return NextResponse.json<TenantBrandingResponse>(
        { found: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<TenantBrandingResponse>({
      found: true,
      branding: {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
        secondaryColor: org.secondaryColor,
        loginBackgroundUrl: org.loginBackgroundUrl,
        welcomeTitle: org.welcomeTitle,
        welcomeSubtitle: org.welcomeSubtitle,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant branding:', error);
    return NextResponse.json<TenantBrandingResponse>(
      { found: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
