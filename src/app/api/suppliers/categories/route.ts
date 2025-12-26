import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

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
  } catch (error) {
    console.error('Error fetching supplier categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
