import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { getDepreciationSchedule } from '@/lib/domains/operations/assets/depreciation';

/**
 * GET /api/assets/[id]/depreciation/schedule - Get projected depreciation schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id: assetId } = await params;

    // Verify asset exists and belongs to tenant
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get depreciation schedule
    const result = await getDepreciationSchedule(assetId, tenantId);

    if (!result) {
      return NextResponse.json(
        { error: 'No depreciation category assigned to this asset' },
        { status: 400 }
      );
    }

    // Get already recorded periods for marking in schedule
    const recordedPeriods = await prisma.depreciationRecord.findMany({
      where: { assetId, tenantId },
      select: { periodEnd: true },
    });

    const recordedDates = new Set(
      recordedPeriods.map((r) => r.periodEnd.toISOString().split('T')[0])
    );

    // Mark schedule items as recorded or projected
    const enrichedSchedule = result.schedule.map((item) => ({
      ...item,
      periodStart: item.periodStart.toISOString(),
      periodEnd: item.periodEnd.toISOString(),
      status: recordedDates.has(item.periodEnd.toISOString().split('T')[0])
        ? ('recorded' as const)
        : ('projected' as const),
    }));

    return NextResponse.json({
      asset: result.asset,
      summary: result.summary,
      schedule: enrichedSchedule,
      recordedCount: recordedPeriods.length,
      projectedCount: enrichedSchedule.filter((s) => s.status === 'projected').length,
    });
  } catch (error) {
    console.error('Get depreciation schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch depreciation schedule' },
      { status: 500 }
    );
  }
}
