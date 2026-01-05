/**
 * @file route.ts
 * @description API endpoint to get the next suggested asset tag
 * @module api/assets/next-tag
 *
 * Format: ORG-CAT-YYSEQ (e.g., BCE-CP-25001)
 * Requires categoryId parameter.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { generateAssetTagByCategory } from '@/lib/domains/operations/assets/asset-utils';

export const GET = withErrorHandler(
  async (request: NextRequest, { tenant }) => {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 }
      );
    }

    const category = await prisma.assetCategory.findFirst({
      where: { id: categoryId, tenantId: tenant.tenantId },
      select: { code: true },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const orgPrefix = await getOrganizationCodePrefix(tenant.tenantId);
    const suggestedTag = await generateAssetTagByCategory(
      category.code,
      tenant.tenantId,
      orgPrefix
    );

    return NextResponse.json({ tag: suggestedTag });
  },
  { requireAuth: true }
);
