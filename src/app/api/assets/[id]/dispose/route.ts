/**
 * @file route.ts
 * @description Asset disposal API endpoint with IFRS-compliant depreciation and gain/loss calculation
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { disposeAssetSchema, previewDisposalSchema } from '@/lib/validations/operations/asset-disposal';
import { processAssetDisposal, previewAssetDisposal } from '@/lib/domains/operations/assets/depreciation';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { DisposalMethod } from '@prisma/client';

/**
 * POST /api/assets/[id]/dispose
 *
 * Process asset disposal with IFRS-compliant depreciation calculation
 *
 * Request Body:
 * {
 *   disposalDate: string (ISO date),
 *   disposalMethod: "SOLD" | "SCRAPPED" | "DONATED" | "WRITTEN_OFF" | "TRADED_IN",
 *   disposalProceeds: number (default 0),
 *   disposalNotes?: string
 * }
 */
async function disposeAssetHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const assetId = context.params?.id;

  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = disposeAssetSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { disposalDate, disposalMethod, disposalProceeds, disposalNotes } = validation.data;

  // Verify asset exists and belongs to tenant
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    select: { id: true, assetTag: true, model: true, status: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  if (asset.status === 'DISPOSED') {
    return NextResponse.json(
      { error: 'Asset is already disposed' },
      { status: 400 }
    );
  }

  // Process disposal
  const result = await processAssetDisposal({
    assetId,
    tenantId,
    disposalDate: new Date(disposalDate),
    disposalMethod: disposalMethod as DisposalMethod,
    disposalProceeds,
    disposalNotes,
    performedById: userId,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Failed to process disposal' },
      { status: 400 }
    );
  }

  // Log activity
  try {
    await logAction(
      tenantId,
      userId,
      ActivityActions.ASSET_DELETED, // Using existing action for disposal
      'Asset',
      assetId,
      {
        disposalMethod,
        disposalProceeds,
        gainLoss: result.asset?.gainLoss,
        isGain: result.asset?.isGain,
        netBookValueAtDisposal: result.asset?.netBookValueAtDisposal,
      }
    );
  } catch {
    // Ignore activity log errors
  }

  return NextResponse.json({
    success: true,
    message: `Asset ${asset.assetTag || asset.model} disposed successfully`,
    disposal: result.asset,
  });
}

export const POST = withErrorHandler(disposeAssetHandler, {
  requireAdmin: true,
  rateLimit: true,
  requireModule: 'assets',
});

/**
 * GET /api/assets/[id]/dispose?date=YYYY-MM-DD&proceeds=0
 *
 * Preview disposal calculation without committing changes
 * Useful for showing expected gain/loss before user confirms
 */
async function previewDisposeHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;
  const assetId = context.params?.id;

  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const proceedsParam = parseFloat(searchParams.get('proceeds') || '0');

  const validation = previewDisposalSchema.safeParse({
    disposalDate: dateParam,
    disposalProceeds: isNaN(proceedsParam) ? 0 : proceedsParam,
  });

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { disposalDate, disposalProceeds } = validation.data;

  // Get preview
  const result = await previewAssetDisposal(
    assetId,
    tenantId,
    new Date(disposalDate),
    disposalProceeds
  );

  if (!result.canDispose) {
    return NextResponse.json(
      { error: result.error || 'Cannot dispose asset' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    canDispose: true,
    preview: result.preview,
  });
}

export const GET = withErrorHandler(previewDisposeHandler, {
  requireAdmin: true,
  rateLimit: true,
  requireModule: 'assets',
});
