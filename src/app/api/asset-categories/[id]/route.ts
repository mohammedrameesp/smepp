/**
 * @file route.ts
 * @description Asset category individual CRUD operations - get, update, delete
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { invalidBodyResponse } from '@/lib/http/responses';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { updateAssetCategorySchema } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/asset-categories/[id]
 * Get a single asset category by ID
 */
async function getAssetCategoryHandler(request: NextRequest, context: APIContext) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const category = await db.assetCategory.findFirst({
    where: { id },
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json(category);
}

export const GET = withErrorHandler(getAssetCategoryHandler, {
  requireAuth: true,
  requireModule: 'assets',
});

/**
 * PUT /api/asset-categories/[id]
 * Update an asset category (admin only)
 */
async function updateAssetCategoryHandler(request: NextRequest, context: APIContext) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if category exists
  const existing = await db.assetCategory.findFirst({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateAssetCategorySchema.safeParse(body);

  if (!validation.success) {
    return invalidBodyResponse(validation.error);
  }

  const data = validation.data;

  // If changing code, check it doesn't conflict with another category
  if (data.code && data.code !== existing.code) {
    const codeConflict = await db.assetCategory.findFirst({
      where: { code: data.code, NOT: { id } },
    });

    if (codeConflict) {
      return NextResponse.json(
        {
          error: `Category code "${data.code}" already exists`,
        },
        { status: 400 }
      );
    }
  }

  const category = await db.assetCategory.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });

  await logAction(
    tenantId,
    currentUserId,
    ActivityActions.ASSET_CATEGORY_UPDATED,
    'AssetCategory',
    category.id,
    { code: category.code, name: category.name, changes: data }
  );

  return NextResponse.json(category);
}

export const PUT = withErrorHandler(updateAssetCategoryHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});

/**
 * DELETE /api/asset-categories/[id]
 * Delete an asset category (admin only, only if no assets use it)
 */
async function deleteAssetCategoryHandler(request: NextRequest, context: APIContext) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if category exists
  const existing = await db.assetCategory.findFirst({
    where: { id },
    include: {
      _count: {
        select: { assets: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  // Check if any assets use this category
  if (existing._count.assets > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete category "${existing.name}" - ${existing._count.assets} asset(s) are using it. Reassign or delete those assets first.`,
      },
      { status: 400 }
    );
  }

  await db.assetCategory.delete({
    where: { id },
  });

  await logAction(
    tenantId,
    currentUserId,
    ActivityActions.ASSET_CATEGORY_DELETED,
    'AssetCategory',
    id,
    { code: existing.code, name: existing.name }
  );

  return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteAssetCategoryHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});
