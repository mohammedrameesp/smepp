/**
 * @file route.ts
 * @description Asset category list and create endpoints
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  createAssetCategorySchema,
  assetCategoryQuerySchema,
} from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { ensureAssetCategories } from '@/features/assets';

/**
 * GET /api/asset-categories
 * List all asset categories for the current tenant
 */
async function getAssetCategoriesHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;

  // Ensure categories exist for this tenant (handles legacy orgs)
  await ensureAssetCategories(tenantId);

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = assetCategoryQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { includeInactive } = validation.data;

  // Build where clause
  const where: Record<string, unknown> = {};
  if (!includeInactive) {
    where.isActive = true;
  }

  const categories = await db.assetCategory.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });

  return NextResponse.json({ categories });
}

export const GET = withErrorHandler(getAssetCategoriesHandler, {
  requireAuth: true,
  requireModule: 'assets',
});

/**
 * POST /api/asset-categories
 * Create a new asset category (admin only)
 */
async function createAssetCategoryHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;

  const body = await request.json();
  const validation = createAssetCategorySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Check if category code already exists in this tenant
  const existing = await db.assetCategory.findFirst({
    where: { code: data.code },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: `Category code "${data.code}" already exists`,
      },
      { status: 400 }
    );
  }

  // Get max sort order for new category
  const maxSortOrder = await db.assetCategory.aggregate({
    _max: { sortOrder: true },
  });

  const category = await db.assetCategory.create({
    data: {
      tenantId,
      code: data.code,
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      isDefault: false,
      isActive: true,
      sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1,
    },
  });

  await logAction(
    tenantId,
    currentUserId,
    ActivityActions.ASSET_CATEGORY_CREATED,
    'AssetCategory',
    category.id,
    { code: category.code, name: category.name }
  );

  return NextResponse.json(category, { status: 201 });
}

export const POST = withErrorHandler(createAssetCategoryHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});
