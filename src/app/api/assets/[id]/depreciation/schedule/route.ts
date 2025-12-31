/**
 * @file route.ts
 * @description Asset depreciation schedule projection API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { getDepreciationSchedule } from '@/lib/domains/operations/assets/depreciation';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
async function getDepreciationScheduleHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const assetId = context.params?.id;
    if (!assetId) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

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
}

export const GET = withErrorHandler(getDepreciationScheduleHandler, { requireAuth: true, requireModule: 'assets' });
