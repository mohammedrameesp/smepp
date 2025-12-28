import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Prisma } from '@prisma/client';
import { createDepreciationCategorySchema } from '@/lib/validations/operations/depreciation';
import { getDepreciationCategories, seedDepreciationCategories } from '@/lib/domains/operations/assets/depreciation';

/**
 * GET /api/depreciation/categories - List all depreciation categories
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const categories = await getDepreciationCategories(!includeInactive);

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
  } catch (error) {
    console.error('Get depreciation categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch depreciation categories' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/depreciation/categories - Create a new depreciation category or seed defaults
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only super admins can create categories (they are system-wide)
    if (!session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();

    // Special action: seed default categories
    if (body.action === 'seed') {
      const results = await seedDepreciationCategories();
      return NextResponse.json({
        message: 'Default depreciation categories seeded',
        results,
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

    // Check if code already exists
    const existing = await prisma.depreciationCategory.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Category with code "${code}" already exists` },
        { status: 400 }
      );
    }

    const category = await prisma.depreciationCategory.create({
      data: {
        name,
        code,
        annualRate: new Prisma.Decimal(annualRate),
        usefulLifeYears,
        description,
        isActive,
      },
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
  } catch (error) {
    console.error('Create depreciation category error:', error);
    return NextResponse.json(
      { error: 'Failed to create depreciation category' },
      { status: 500 }
    );
  }
}
