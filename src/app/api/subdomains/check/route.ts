import { NextRequest, NextResponse } from 'next/server';
import { validateSlug, isSlugAvailable } from '@/lib/multi-tenant/subdomain';

/**
 * GET /api/subdomains/check?slug=acme
 *
 * Check if a subdomain/slug is available for use
 */
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
