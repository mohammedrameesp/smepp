/**
 * @file route.ts
 * @description API for managing deleted (trashed) assets
 * @module api/assets/deleted
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * Get all soft-deleted assets (trash).
 *
 * @route GET /api/assets/deleted
 *
 * @returns {{ assets: Asset[], count: number }} Deleted assets with recovery deadline
 */
async function getDeletedAssetsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const assets = await db.asset.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: 'desc' },
    select: {
      id: true,
      assetTag: true,
      model: true,
      brand: true,
      type: true,
      status: true,
      deletedAt: true,
      deletedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assetCategory: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  // Add recovery deadline (7 days from deletion)
  const assetsWithDeadline = assets.map(asset => ({
    ...asset,
    recoveryDeadline: asset.deletedAt
      ? new Date(new Date(asset.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000)
      : null,
    daysRemaining: asset.deletedAt
      ? Math.max(0, Math.ceil((new Date(asset.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0,
  }));

  return NextResponse.json({
    assets: assetsWithDeadline,
    count: assets.length,
  });
}

export const GET = withErrorHandler(getDeletedAssetsHandler, { requireAdmin: true, requireModule: 'assets' });
