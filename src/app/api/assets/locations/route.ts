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

    // Get all distinct asset locations where location is not null
    const assets = await prisma.asset.findMany({
      where: {
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
  } catch (error) {
    console.error('Asset locations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset locations' }, { status: 500 });
  }
}
