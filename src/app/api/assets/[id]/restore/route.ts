/**
 * @file route.ts
 * @description Restore soft-deleted asset from trash
 * @module api/assets/[id]/restore
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { logAction, ActivityActions } from '@/lib/core/activity';

/**
 * Restore a soft-deleted asset from trash.
 *
 * @route POST /api/assets/[id]/restore
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @returns {{ message: string, asset: Asset }} Restored asset
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 * @throws {404} Asset not found or not deleted
 */
async function restoreAssetHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Find deleted asset
  const asset = await db.asset.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, model: true, brand: true, type: true, assetTag: true, deletedAt: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found or not in trash' }, { status: 404 });
  }

  // Restore asset (clear deletedAt and deletedById)
  const restoredAsset = await db.asset.update({
    where: { id },
    data: {
      deletedAt: null,
      deletedById: null,
    },
    select: {
      id: true,
      assetTag: true,
      model: true,
      brand: true,
      type: true,
      status: true,
    },
  });

  // Log restoration
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.ASSET_UPDATED,
    'Asset',
    asset.id,
    { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag, action: 'restored' }
  );

  return NextResponse.json({
    message: 'Asset restored successfully',
    asset: restoredAsset,
  });
}

export const POST = withErrorHandler(restoreAssetHandler, { requireAdmin: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None required - file is well-documented
 * Issues: None - proper tenant isolation, activity logging for restoration
 */
