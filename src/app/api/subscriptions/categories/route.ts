import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get distinct categories from database
    const subscriptions = await prisma.subscription.findMany({
      where: {
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
