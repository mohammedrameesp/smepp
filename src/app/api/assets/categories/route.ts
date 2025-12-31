/**
 * @file route.ts
 * @description Asset categories autocomplete API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getCategoriesHandler(request: NextRequest, _context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Get query parameter for search
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get all distinct asset categories where category is not null
    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    // Extract categories and filter by query (case-insensitive)
    let categories = assets
      .map((asset) => asset.category)
      .filter((cat): cat is string => cat !== null);

    if (query) {
      const lowerQuery = query.toLowerCase();
      categories = categories.filter((category) => category.toLowerCase().includes(lowerQuery));
    }

    // Limit to 10 suggestions
    categories = categories.slice(0, 10);

    return NextResponse.json({ categories });
}

export const GET = withErrorHandler(getCategoriesHandler, { requireAuth: true, requireModule: 'assets' });
