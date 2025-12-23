import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getActivePeriods } from '@/lib/subscription-lifecycle';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const periods = await getActivePeriods(id);

    return NextResponse.json({ periods });
  } catch (error) {
    console.error('Error getting active periods:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get active periods' },
      { status: 500 }
    );
  }
}
