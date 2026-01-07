/**
 * @file route.ts
 * @description Depreciation categories API - CRUD operations for tenant-scoped categories
 * @module api/depreciation/categories
 *
 * FEATURES:
 * - List categories for current organization
 * - Create new categories
 * - Seed default categories (Qatar Tax Rates)
 *
 * SECURITY:
 * - Auth required
 * - Admin role required for create/seed
 * - All queries are tenant-scoped
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getDepreciationCategories,
  seedDepreciationCategories,
  createDepreciationCategory,
} from '@/features/assets/lib/depreciation';
import { createDepreciationCategorySchema } from '@/features/assets';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/depreciation/categories - List depreciation categories
// ═══════════════════════════════════════════════════════════════════════════════

async function getHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const categories = await getDepreciationCategories(tenantId, !includeInactive);

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      annualRate: Number(c.annualRate),
      usefulLifeYears: c.usefulLifeYears,
      description: c.description,
      isActive: c.isActive,
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/depreciation/categories - Create or seed categories
// ═══════════════════════════════════════════════════════════════════════════════

async function postHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;

  const body = await request.json();

  // Special action: seed default categories
  if (body.action === 'seed') {
    const results = await seedDepreciationCategories(tenantId);

    // Return the seeded categories so frontend can use them directly
    const categories = await getDepreciationCategories(tenantId, false);

    return NextResponse.json({
      message: 'Default depreciation categories seeded',
      results,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        annualRate: Number(c.annualRate),
        usefulLifeYears: c.usefulLifeYears,
        description: c.description,
        isActive: c.isActive,
      })),
    });
  }

  // Create new category
  const validation = createDepreciationCategorySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { name, code, annualRate, usefulLifeYears, description, isActive } = validation.data;

  // Check if code already exists for this tenant
  const existing = await prisma.depreciationCategory.findFirst({
    where: { tenantId, code },
  });

  if (existing) {
    return NextResponse.json(
      { error: `Category with code "${code}" already exists` },
      { status: 400 }
    );
  }

  const category = await createDepreciationCategory(tenantId, {
    name,
    code,
    annualRate,
    usefulLifeYears,
    description,
    isActive,
  });

  return NextResponse.json(
    {
      message: 'Depreciation category created successfully',
      category: {
        id: category.id,
        name: category.name,
        code: category.code,
        annualRate: Number(category.annualRate),
        usefulLifeYears: category.usefulLifeYears,
        description: category.description,
        isActive: category.isActive,
      },
    },
    { status: 201 }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getHandler, { requireAuth: true });
export const POST = withErrorHandler(postHandler, { requireAdmin: true });
