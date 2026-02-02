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
import { invalidBodyResponse } from '@/lib/http/responses';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/depreciation/categories - List depreciation categories
// ═══════════════════════════════════════════════════════════════════════════════

async function getHandler(_request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;

  // Check if depreciation is enabled for this organization
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { depreciationEnabled: true },
  });

  if (!org?.depreciationEnabled) {
    return NextResponse.json({ categories: [] });
  }

  const categories = await getDepreciationCategories(tenantId);

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      annualRate: Number(c.annualRate),
      usefulLifeYears: c.usefulLifeYears,
      description: c.description,
    })),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/depreciation/categories - Create or seed categories
// ═══════════════════════════════════════════════════════════════════════════════

async function postHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;

  // Check if depreciation is enabled for this organization
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { depreciationEnabled: true },
  });

  if (!org?.depreciationEnabled) {
    return NextResponse.json(
      { error: 'Depreciation tracking is disabled for this organization' },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Special action: seed default categories
  if (body.action === 'seed') {
    const results = await seedDepreciationCategories(tenantId);

    // Return the seeded categories so frontend can use them directly
    const categories = await getDepreciationCategories(tenantId);

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
      })),
    });
  }

  // Create new category
  const validation = createDepreciationCategorySchema.safeParse(body);

  if (!validation.success) {
    return invalidBodyResponse(validation.error);
  }

  const { name, code, annualRate, usefulLifeYears, description } = validation.data;

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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
