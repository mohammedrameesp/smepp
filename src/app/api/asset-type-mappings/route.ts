/**
 * @file route.ts
 * @description Asset type mapping list and create endpoints
 * @module operations/assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { createAssetTypeMappingSchema } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/asset-type-mappings
 * List all custom asset type mappings for the current tenant
 */
async function getAssetTypeMappingsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const mappings = await db.assetTypeMapping.findMany({
    include: {
      category: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
    orderBy: { typeName: 'asc' },
  });

  return NextResponse.json({ mappings });
}

export const GET = withErrorHandler(getAssetTypeMappingsHandler, {
  requireAuth: true,
  requireModule: 'assets',
});

/**
 * POST /api/asset-type-mappings
 * Create a new custom asset type mapping (admin only)
 */
async function createAssetTypeMappingHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const currentUserId = tenant.userId;

  const body = await request.json();
  const validation = createAssetTypeMappingSchema.safeParse(body);

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

  // Check if type name already exists in this tenant (case-insensitive)
  const existing = await db.assetTypeMapping.findFirst({
    where: {
      typeName: { equals: data.typeName, mode: 'insensitive' },
    },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: `Type "${data.typeName}" already exists`,
      },
      { status: 400 }
    );
  }

  // Verify category belongs to this tenant
  const category = await db.assetCategory.findFirst({
    where: { id: data.categoryId },
  });

  if (!category) {
    return NextResponse.json(
      {
        error: 'Category not found',
      },
      { status: 400 }
    );
  }

  const mapping = await db.assetTypeMapping.create({
    data: {
      tenantId,
      typeName: data.typeName,
      categoryId: data.categoryId,
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
    ActivityActions.ASSET_TYPE_MAPPING_CREATED,
    'AssetTypeMapping',
    mapping.id,
    { typeName: mapping.typeName, categoryCode: category.code }
  );

  return NextResponse.json(mapping, { status: 201 });
}

export const POST = withErrorHandler(createAssetTypeMappingHandler, {
  requireAdmin: true,
  requireModule: 'assets',
});
