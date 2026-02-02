/**
 * @file route.ts
 * @description Asset filter options API - returns dynamic type and category options
 * @module api/assets/filters
 *
 * Returns only types and categories that have at least one asset,
 * sorted by count (most assets first), limited to 10 each.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { prisma as globalPrisma } from '@/lib/core/prisma';

async function getHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;
  const tenantId = tenant!.tenantId;

  // Get types with counts using raw query for better control
  const typeGroups = await globalPrisma.$queryRaw<{ type: string; count: bigint }[]>`
    SELECT type, COUNT(*) as count
    FROM "Asset"
    WHERE "tenantId" = ${tenantId}
    GROUP BY type
    ORDER BY count DESC
    LIMIT 10
  `;

  // Get categories with counts
  const categoryGroups = await globalPrisma.$queryRaw<{ categoryId: string; count: bigint }[]>`
    SELECT "categoryId", COUNT(*) as count
    FROM "Asset"
    WHERE "tenantId" = ${tenantId} AND "categoryId" IS NOT NULL
    GROUP BY "categoryId"
    ORDER BY count DESC
    LIMIT 10
  `;

  // Fetch category details for the IDs
  const categoryIds = categoryGroups.map((g) => g.categoryId);

  const categories = categoryIds.length > 0
    ? await globalPrisma.assetCategory.findMany({
        where: { id: { in: categoryIds }, tenantId },
        select: { id: true, code: true, name: true },
      })
    : [];

  // Build category options with counts (maintain order by count)
  const categoryOptions = categoryGroups
    .map((g) => {
      const category = categories.find((c) => c.id === g.categoryId);
      if (!category) return null;
      return {
        id: category.id,
        code: category.code,
        name: category.name,
        count: Number(g.count),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return NextResponse.json({
    types: typeGroups.map((g) => ({
      type: g.type,
      count: Number(g.count),
    })),
    categories: categoryOptions,
  });
}

export const GET = withErrorHandler(getHandler, { requireAuth: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None required - file is well-documented
 * Issues: None - uses raw SQL with parameterized queries for tenantId safety
 */
