/**
 * @file route.ts
 * @description Asset locations autocomplete API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getLocationsHandler(request: NextRequest, _context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Get query parameter for search
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get all distinct asset locations where location is not null (tenant-scoped)
    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
        location: {
          not: null,
        },
      },
      select: {
        location: true,
      },
      distinct: ['location'],
      orderBy: {
        location: 'asc',
      },
    });

    // Extract locations and filter by query (case-insensitive)
    let locations = assets
      .map((asset) => asset.location)
      .filter((loc): loc is string => loc !== null);

    if (query) {
      const lowerQuery = query.toLowerCase();
      locations = locations.filter((location) => location.toLowerCase().includes(lowerQuery));
    }

    // Limit to 10 suggestions
    locations = locations.slice(0, 10);

    return NextResponse.json({ locations });
}

export const GET = withErrorHandler(getLocationsHandler, { requireAuth: true, requireModule: 'assets' });
