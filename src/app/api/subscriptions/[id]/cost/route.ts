import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { calculateTotalCost } from '@/lib/subscription-lifecycle';

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

    const costBreakdown = await calculateTotalCost(id);

    return NextResponse.json(costBreakdown);
  } catch (error) {
    console.error('Error calculating subscription cost:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate cost' },
      { status: 500 }
    );
  }
}
