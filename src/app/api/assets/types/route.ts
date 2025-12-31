/**
 * @file route.ts
 * @description Asset types autocomplete API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getTypesHandler(request: NextRequest, _context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Get query parameter for search
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get all distinct asset types (tenant-scoped)
    const assets = await prisma.asset.findMany({
      where: { tenantId },
      select: {
        type: true,
      },
      distinct: ['type'],
      orderBy: {
        type: 'asc',
      },
    });

    // Extract types and filter by query (case-insensitive)
    let types = assets.map((asset) => asset.type);

    if (query) {
      const lowerQuery = query.toLowerCase();
      types = types.filter((type) => type.toLowerCase().includes(lowerQuery));
    }

    // Limit to 10 suggestions
    types = types.slice(0, 10);

    return NextResponse.json({ types });
}

export const GET = withErrorHandler(getTypesHandler, { requireAuth: true, requireModule: 'assets' });
