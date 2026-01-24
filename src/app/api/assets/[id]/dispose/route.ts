/**
 * @file route.ts
 * @description Asset disposal API endpoint with IFRS-compliant depreciation and gain/loss calculation
 * @module api/assets/[id]/dispose
 *
 * FEATURES:
 * - IFRS-compliant asset disposal
 * - Pro-rata depreciation calculation up to disposal date
 * - Gain/loss calculation (proceeds - net book value)
 * - Multiple disposal methods (SOLD, SCRAPPED, DONATED, etc.)
 * - Preview mode for showing expected values before commit
 *
 * ACCOUNTING:
 * - Net Book Value (NBV) = Original Cost - Accumulated Depreciation
 * - Gain = Proceeds - NBV (when proceeds > NBV)
 * - Loss = NBV - Proceeds (when proceeds < NBV)
 *
 * DISPOSAL METHODS:
 * - SOLD: Asset sold for cash
 * - SCRAPPED: Asset destroyed/recycled
 * - DONATED: Asset given away
 * - WRITTEN_OFF: Asset removed from books
 * - TRADED_IN: Asset exchanged for new asset
 *
 * SECURITY:
 * - Admin role required
 * - Rate limiting enabled
 * - Assets module must be enabled
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { invalidBodyResponse } from '@/lib/http/responses';
import { disposeAssetSchema, previewDisposalSchema } from '@/features/assets';
import { processAssetDisposal, previewAssetDisposal } from '@/features/assets/lib/depreciation';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { DisposalMethod } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/assets/[id]/dispose - Process Asset Disposal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process asset disposal with IFRS-compliant depreciation and gain/loss calculation.
 * This permanently disposes the asset and records all financial details.
 *
 * @route POST /api/assets/[id]/dispose
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @body {string} disposalDate - Date of disposal (ISO date string)
 * @body {string} disposalMethod - Method: SOLD, SCRAPPED, DONATED, WRITTEN_OFF, TRADED_IN
 * @body {number} [disposalProceeds=0] - Sale proceeds (0 for scrapped/donated)
 * @body {string} [disposalNotes] - Optional notes about disposal
 *
 * @returns {{ success: boolean, message: string, disposal: object }}
 *
 * @throws {400} Asset ID is required
 * @throws {400} Invalid request body
 * @throws {400} Asset is already disposed
 * @throws {400} Failed to process disposal
 * @throws {404} Asset not found
 *
 * @sideEffects
 * - Updates asset status to DISPOSED
 * - Calculates and stores final depreciation
 * - Records disposal financial details
 * - Logs activity for audit
 *
 * @example Request:
 * {
 *   "disposalDate": "2025-01-15",
 *   "disposalMethod": "SOLD",
 *   "disposalProceeds": 5000,
 *   "disposalNotes": "Sold to employee at book value"
 * }
 *
 * @example Response:
 * {
 *   "success": true,
 *   "message": "Asset ORG-CP-25001 disposed successfully",
 *   "disposal": {
 *     "netBookValueAtDisposal": 4500,
 *     "gainLoss": 500,
 *     "isGain": true
 *   }
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

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Parse and validate request body
  // ─────────────────────────────────────────────────────────────────────────────
  const body = await request.json();
  const validation = disposeAssetSchema.safeParse(body);

  if (!validation.success) {
    return invalidBodyResponse(validation.error);
  }

  const { disposalDate, disposalMethod, disposalProceeds, disposalNotes } = validation.data;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Verify asset exists and is not already disposed
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Process disposal (calculates depreciation, gain/loss, updates status)
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Log activity for audit trail (non-critical)
  // ─────────────────────────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/[id]/dispose - Preview Disposal (Before Committing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Preview disposal calculation without committing changes.
 * Useful for showing expected gain/loss before user confirms disposal.
 *
 * @route GET /api/assets/[id]/dispose?date=YYYY-MM-DD&proceeds=0
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @query {string} [date] - Disposal date (defaults to today)
 * @query {number} [proceeds=0] - Expected sale proceeds
 *
 * @returns {{ canDispose: boolean, preview: object }}
 *
 * @throws {400} Asset ID is required
 * @throws {400} Invalid query parameters
 * @throws {400} Cannot dispose asset (with reason)
 *
 * @example Request:
 * GET /api/assets/clx123/dispose?date=2025-01-15&proceeds=5000
 *
 * @example Response:
 * {
 *   "canDispose": true,
 *   "preview": {
 *     "originalCost": 10000,
 *     "accumulatedDepreciation": 5500,
 *     "netBookValue": 4500,
 *     "proceeds": 5000,
 *     "gainLoss": 500,
 *     "isGain": true
 *   }
 * }
 */
async function previewDisposeHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;
  const assetId = context.params?.id;

  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Parse query parameters
  // ─────────────────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const proceedsParam = parseFloat(searchParams.get('proceeds') || '0');

  const validation = previewDisposalSchema.safeParse({
    disposalDate: dateParam,
    disposalProceeds: isNaN(proceedsParam) ? 0 : proceedsParam,
  });

  if (!validation.success) {
    return invalidBodyResponse(validation.error);
  }

  const { disposalDate, disposalProceeds } = validation.data;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Get preview (read-only calculation, no database changes)
  // ─────────────────────────────────────────────────────────────────────────────
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
