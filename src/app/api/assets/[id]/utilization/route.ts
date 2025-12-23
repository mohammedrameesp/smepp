import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAssetUtilization } from '@/lib/asset-lifecycle';

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

    const utilization = await getAssetUtilization(id);

    return NextResponse.json(utilization);
  } catch (error) {
    console.error('Error calculating asset utilization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate utilization' },
      { status: 500 }
    );
  }
}
