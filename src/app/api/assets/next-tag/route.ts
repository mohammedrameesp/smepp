/**
 * @file route.ts
 * @description API endpoint to get the next suggested asset tag
 * @module api/assets/next-tag
 *
 * Supports two formats:
 * - New format (category-based): ?categoryId=xxx -> BCE-CP-25001
 * - Legacy format (type-based): ?type=Laptop -> BCE-LAP-2024-001
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import {
  generateAssetTag,
  generateAssetTagByCategory,
} from '@/lib/domains/operations/assets/asset-utils';

export const GET = withErrorHandler(
  async (request: NextRequest, { tenant }) => {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    // New format: generate tag based on category
    if (categoryId) {
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
    }

    // Legacy format: generate tag based on type (deprecated)
    if (type) {
      const suggestedTag = await generateAssetTag(type, tenant.tenantId);
      return NextResponse.json({ tag: suggestedTag });
    }

    return NextResponse.json(
      { error: 'Either categoryId or type is required' },
      { status: 400 }
    );
  },
  { requireAuth: true }
);
