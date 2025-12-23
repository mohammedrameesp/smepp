import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getAssetHistory } from '@/lib/asset-history';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get asset history
    const history = await getAssetHistory(id);

    return NextResponse.json(history);

  } catch (error) {
    console.error('Asset history GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset history' },
      { status: 500 }
    );
  }
}