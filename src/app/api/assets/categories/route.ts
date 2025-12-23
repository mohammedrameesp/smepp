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

    // Get query parameter for search
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get all distinct asset categories where category is not null
    const assets = await prisma.asset.findMany({
      where: {
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
  } catch (error) {
    console.error('Asset categories GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset categories' }, { status: 500 });
  }
}
