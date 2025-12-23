import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAssignmentPeriods } from '@/lib/asset-lifecycle';

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

    const periods = await getAssignmentPeriods(id);

    return NextResponse.json(periods);
  } catch (error) {
    console.error('Error getting assignment periods:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get assignment periods' },
      { status: 500 }
    );
  }
}
