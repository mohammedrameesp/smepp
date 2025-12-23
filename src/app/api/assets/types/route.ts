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

    // Get all distinct asset types
    const assets = await prisma.asset.findMany({
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
  } catch (error) {
    console.error('Asset types GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset types' }, { status: 500 });
  }
}
