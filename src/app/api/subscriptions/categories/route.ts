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

    // Get search query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get distinct categories from database
    const subscriptions = await prisma.subscription.findMany({
      where: {
        tenantId,
        category: {
          not: null,
          contains: query,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      take: 10,
    });

    // Extract unique categories and filter out nulls
    const categories = subscriptions
      .map((s) => s.category)
      .filter((c): c is string => c !== null)
      .sort();

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Subscription categories GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription categories' },
      { status: 500 }
    );
  }
}
