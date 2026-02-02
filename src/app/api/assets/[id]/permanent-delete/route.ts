/**
 * @file route.ts
 * @description Permanently delete an asset (no recovery possible)
 * @module api/assets/[id]/permanent-delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { logAction, ActivityActions } from '@/lib/core/activity';

/**
 * Permanently delete an asset from trash.
 * This action is irreversible and cascades to all related records.
 *
 * @route DELETE /api/assets/[id]/permanent-delete
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @returns {{ message: string }} Success message
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required / Asset is not in trash
 * @throws {404} Asset not found
 */
async function permanentDeleteHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Only allow permanent deletion of already soft-deleted assets
  const asset = await db.asset.findFirst({
    where: { id, deletedAt: { not: null } },
    select: { id: true, model: true, brand: true, type: true, assetTag: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found in trash. Use regular delete first.' }, { status: 404 });
  }

  // Permanently delete (cascades to history, maintenance, etc.)
  await db.asset.delete({
    where: { id },
  });

  // Log permanent deletion
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.ASSET_DELETED,
    'Asset',
    asset.id,
    { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag, permanentDelete: true }
  );

  return NextResponse.json({
    message: 'Asset permanently deleted',
  });
}

export const DELETE = withErrorHandler(permanentDeleteHandler, { requireAdmin: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None required - file is well-documented
 * Issues: None - proper tenant isolation, only allows deletion of soft-deleted assets,
 *         activity logging for permanent deletion audit trail
 */
