import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import {
  assignDepreciationCategorySchema,
  triggerDepreciationSchema,
  depreciationRecordsQuerySchema,
} from '@/lib/validations/operations/depreciation';
import {
  getDepreciationRecords,
  runDepreciationForAsset,
  assignDepreciationCategory,
} from '@/lib/domains/operations/assets/depreciation';
import { logAction } from '@/lib/activity';

/**
 * GET /api/assets/[id]/depreciation - Get depreciation records for an asset
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
      select: {
        id: true,
        assetTag: true,
        model: true,
        priceQAR: true,
        price: true,
        salvageValue: true,
        accumulatedDepreciation: true,
        netBookValue: true,
        lastDepreciationDate: true,
        isFullyDepreciated: true,
        depreciationCategory: {
          select: {
            id: true,
            name: true,
            code: true,
            annualRate: true,
            usefulLifeYears: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = depreciationRecordsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { limit, offset, order } = validation.data;

    // Get depreciation records
    const { records, total, hasMore } = await getDepreciationRecords(assetId, tenantId, {
      limit,
      offset,
      orderBy: order,
    });

    return NextResponse.json({
      asset: {
        id: asset.id,
        assetTag: asset.assetTag,
        model: asset.model,
        acquisitionCost: Number(asset.priceQAR || asset.price || 0),
        salvageValue: Number(asset.salvageValue || 0),
        accumulatedDepreciation: Number(asset.accumulatedDepreciation || 0),
        netBookValue: Number(asset.netBookValue || 0),
        lastDepreciationDate: asset.lastDepreciationDate,
        isFullyDepreciated: asset.isFullyDepreciated,
        depreciationCategory: asset.depreciationCategory
          ? {
              ...asset.depreciationCategory,
              annualRate: Number(asset.depreciationCategory.annualRate),
            }
          : null,
      },
      records,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Get depreciation records error:', error);
    return NextResponse.json({ error: 'Failed to fetch depreciation records' }, { status: 500 });
  }
}

/**
 * POST /api/assets/[id]/depreciation - Manually trigger depreciation or assign category
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can trigger depreciation
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id: assetId } = await params;

    const body = await request.json();
    const action = body.action as string;

    // Verify asset exists and belongs to tenant
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      select: { id: true, assetTag: true, model: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    if (action === 'assign_category') {
      // Assign depreciation category to asset
      const validation = assignDepreciationCategorySchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validation.error.issues },
          { status: 400 }
        );
      }

      const updatedAsset = await assignDepreciationCategory(assetId, tenantId, {
        depreciationCategoryId: validation.data.depreciationCategoryId,
        salvageValue: validation.data.salvageValue,
        customUsefulLifeMonths: validation.data.customUsefulLifeMonths,
        depreciationStartDate: validation.data.depreciationStartDate
          ? new Date(validation.data.depreciationStartDate)
          : undefined,
      });

      await logAction(session.user.id, 'DEPRECIATION_CATEGORY_ASSIGNED', 'Asset', assetId, {
        assetTag: asset.assetTag,
        model: asset.model,
        categoryId: validation.data.depreciationCategoryId,
        salvageValue: validation.data.salvageValue,
      });

      return NextResponse.json({
        message: 'Depreciation category assigned successfully',
        asset: {
          id: updatedAsset.id,
          depreciationCategoryId: updatedAsset.depreciationCategoryId,
          salvageValue: Number(updatedAsset.salvageValue || 0),
          netBookValue: Number(updatedAsset.netBookValue || 0),
        },
      });
    } else {
      // Trigger manual depreciation calculation
      const validation = triggerDepreciationSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: validation.error.issues },
          { status: 400 }
        );
      }

      const result = await runDepreciationForAsset(
        assetId,
        tenantId,
        'MANUAL',
        session.user.id,
        validation.data.calculationDate
      );

      if (!result.success) {
        if (result.skipped) {
          return NextResponse.json(
            { message: result.skipReason, skipped: true },
            { status: 200 }
          );
        }
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      await logAction(session.user.id, 'DEPRECIATION_CALCULATED', 'Asset', assetId, {
        assetTag: asset.assetTag,
        model: asset.model,
        periodEnd: result.record?.periodEnd,
        amount: result.record?.depreciationAmount,
        accumulated: result.record?.accumulatedAmount,
      });

      return NextResponse.json({
        message: 'Depreciation calculated successfully',
        record: result.record,
      });
    }
  } catch (error) {
    console.error('Depreciation action error:', error);
    return NextResponse.json({ error: 'Failed to process depreciation action' }, { status: 500 });
  }
}
