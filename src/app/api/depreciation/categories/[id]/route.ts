/**
 * @file route.ts
 * @description Depreciation category API - Individual category operations
 * @module api/depreciation/categories/[id]
 *
 * FEATURES:
 * - Get single category details
 * - Update category settings
 * - Delete category (if not in use)
 *
 * SECURITY:
 * - Auth required for GET
 * - Admin role required for PUT/DELETE
 * - All queries are tenant-scoped
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateDepreciationCategory,
  deleteDepreciationCategory,
} from '@/features/assets/lib/depreciation';
import { updateDepreciationCategorySchema } from '@/features/assets';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/depreciation/categories/[id] - Get single category
// ═══════════════════════════════════════════════════════════════════════════════

async function getHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }

  const category = await prisma.depreciationCategory.findFirst({
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

  return NextResponse.json({
    category: {
      id: category.id,
      name: category.name,
      code: category.code,
      annualRate: Number(category.annualRate),
      usefulLifeYears: category.usefulLifeYears,
      description: category.description,
      assetsCount: category._count.assets,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/depreciation/categories/[id] - Update category
// ═══════════════════════════════════════════════════════════════════════════════

async function putHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }

  // Verify category exists
  const existing = await prisma.depreciationCategory.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateDepreciationCategorySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  // Check code uniqueness if changing code
  if (validation.data.code && validation.data.code !== existing.code) {
    const codeExists = await prisma.depreciationCategory.findFirst({
      where: { tenantId, code: validation.data.code, id: { not: id } },
    });

    if (codeExists) {
      return NextResponse.json(
        { error: `Category with code "${validation.data.code}" already exists` },
        { status: 400 }
      );
    }
  }

  const category = await updateDepreciationCategory(id, tenantId, validation.data);

  return NextResponse.json({
    message: 'Category updated successfully',
    category: {
      id: category.id,
      name: category.name,
      code: category.code,
      annualRate: Number(category.annualRate),
      usefulLifeYears: category.usefulLifeYears,
      description: category.description,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/depreciation/categories/[id] - Delete category
// ═══════════════════════════════════════════════════════════════════════════════

async function deleteHandler(request: NextRequest, context: APIContext) {
  const { tenant, params } = context;
  const tenantId = tenant!.tenantId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
  }

  try {
    await deleteDepreciationCategory(id, tenantId);
    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Cannot delete')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getHandler, { requireAuth: true });
export const PUT = withErrorHandler(putHandler, { requireAdmin: true });
export const DELETE = withErrorHandler(deleteHandler, { requireAdmin: true });
