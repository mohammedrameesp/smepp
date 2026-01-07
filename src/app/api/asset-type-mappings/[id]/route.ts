/**
 * @file route.ts
 * @description Asset type mapping individual CRUD operations - get, update, delete
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { updateAssetTypeMappingSchema } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/asset-type-mappings/[id]
 * Get a single asset type mapping by ID
 */
async function getAssetTypeMappingHandler(request: NextRequest, context: APIContext) {
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const mapping = await prisma.assetTypeMapping.findFirst({
    where: { id, tenantId },
    include: {
      category: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!mapping) {
    return NextResponse.json({ error: 'Type mapping not found' }, { status: 404 });
  }

  return NextResponse.json(mapping);
}

export const GET = withErrorHandler(getAssetTypeMappingHandler, {
  requireAuth: true,
  requireModule: 'assets',
});

/**
 * PUT /api/asset-type-mappings/[id]
 * Update an asset type mapping (admin only)
 */
async function updateAssetTypeMappingHandler(request: NextRequest, context: APIContext) {
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const currentUserId = tenant!.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if mapping exists
  const existing = await prisma.assetTypeMapping.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Type mapping not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateAssetTypeMappingSchema.safeParse(body);

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

  // If changing type name, check it doesn't conflict with another mapping
  if (data.typeName && data.typeName.toLowerCase() !== existing.typeName.toLowerCase()) {
    const nameConflict = await prisma.assetTypeMapping.findFirst({
      where: {
        tenantId,
        typeName: { equals: data.typeName, mode: 'insensitive' },
        NOT: { id },
      },
    });

    if (nameConflict) {
      return NextResponse.json(
        {
          error: `Type "${data.typeName}" already exists`,
        },
        { status: 400 }
      );
    }
  }

  // If changing category, verify it belongs to this tenant
  if (data.categoryId && data.categoryId !== existing.categoryId) {
    const category = await prisma.assetCategory.findFirst({
      where: { id: data.categoryId, tenantId },
    });

    if (!category) {
      return NextResponse.json(
        {
          error: 'Category not found',
        },
        { status: 400 }
      );
    }
  }

  const mapping = await prisma.assetTypeMapping.update({
    where: { id },
    data: {
      ...(data.typeName !== undefined && { typeName: data.typeName }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
    },
    include: {
      category: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  await logAction(
    tenantId,
    currentUserId,
    ActivityActions.ASSET_TYPE_MAPPING_UPDATED,
    'AssetTypeMapping',
    mapping.id,
    { typeName: mapping.typeName, changes: data }
  );

  return NextResponse.json(mapping);
}

export const PUT = withErrorHandler(updateAssetTypeMappingHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});

/**
 * DELETE /api/asset-type-mappings/[id]
 * Delete an asset type mapping (admin only)
 */
async function deleteAssetTypeMappingHandler(request: NextRequest, context: APIContext) {
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const currentUserId = tenant!.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if mapping exists
  const existing = await prisma.assetTypeMapping.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Type mapping not found' }, { status: 404 });
  }

  await prisma.assetTypeMapping.delete({
    where: { id },
  });

  await logAction(
    tenantId,
    currentUserId,
    ActivityActions.ASSET_TYPE_MAPPING_DELETED,
    'AssetTypeMapping',
    id,
    { typeName: existing.typeName }
  );

  return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteAssetTypeMappingHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});
