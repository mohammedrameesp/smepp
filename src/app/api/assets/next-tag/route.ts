/**
 * @file route.ts
 * @description API endpoint to get the next suggested asset tag
 * @module api/assets/next-tag
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';
import { generateAssetTag } from '@/lib/domains/operations/assets/asset-utils';

export const GET = withErrorHandler(
  async (request: NextRequest, { tenant }) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: 'Asset type is required' }, { status: 400 });
    }

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 400 });
    }

    const suggestedTag = await generateAssetTag(type, tenant.tenantId);

    return NextResponse.json({ tag: suggestedTag });
  },
  { requireAuth: true }
);
