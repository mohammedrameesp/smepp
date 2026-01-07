/**
 * @file route.ts
 * @description Asset category individual CRUD operations - get, update, delete
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { updateAssetCategorySchema } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/asset-categories/[id]
 * Get a single asset category by ID
 */
async function getAssetCategoryHandler(request: NextRequest, context: APIContext) {
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const category = await prisma.assetCategory.findFirst({
    where: { id, tenantId },
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
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const currentUserId = tenant!.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if category exists
  const existing = await prisma.assetCategory.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateAssetCategorySchema.safeParse(body);

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

  // If changing code, check it doesn't conflict with another category
  if (data.code && data.code !== existing.code) {
    const codeConflict = await prisma.assetCategory.findFirst({
      where: { tenantId, code: data.code, NOT: { id } },
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

  const category = await prisma.assetCategory.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
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
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const currentUserId = tenant!.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if category exists
  const existing = await prisma.assetCategory.findFirst({
    where: { id, tenantId },
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

  await prisma.assetCategory.delete({
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
