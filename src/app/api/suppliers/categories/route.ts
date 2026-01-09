/**
 * @file route.ts
 * @description Get distinct supplier categories for autocomplete
 * Supports both authenticated and public (subdomain) requests
 * @module operations/suppliers
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getCategoriesHandler(request: NextRequest, _context: APIContext) {
    let tenantId: string | null = null;

    // Try to get tenant from session (authenticated users)
    const session = await getServerSession(authOptions);
    if (session?.user?.organizationId) {
      tenantId = session.user.organizationId;
    } else {
      // For public access, get tenant from subdomain
      const subdomain = request.headers.get('x-subdomain');
      if (subdomain) {
        const organization = await prisma.organization.findUnique({
          where: { slug: subdomain.toLowerCase() },
          select: { id: true },
        });
        if (organization) {
          tenantId = organization.id;
        }
      }
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get distinct categories from approved suppliers that match the query
    const categories = await prisma.supplier.findMany({
      where: {
        tenantId,
        category: {
          contains: query,
        },
        status: 'APPROVED', // Only show categories from approved suppliers
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
      take: 10,
    });

    // Extract unique category names
    const uniqueCategories = categories.map(s => s.category);

    return NextResponse.json({
      categories: uniqueCategories,
    });
}

// Public route - auth handled internally to support both authenticated and subdomain access
export const GET = withErrorHandler(getCategoriesHandler, { rateLimit: true });
