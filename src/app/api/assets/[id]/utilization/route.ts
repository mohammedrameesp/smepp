/**
 * @file route.ts
 * @description Asset utilization metrics API endpoint
 * @module operations/assets
 */
import { NextResponse } from 'next/server';
import { getAssetUtilization } from '@/features/assets';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse } from '@/lib/http/errors';

export const GET = withErrorHandler(async (_request, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const id = params?.id;
  if (!id) {
    return badRequestResponse('ID is required');
  }

  try {
    const utilization = await getAssetUtilization(id, tenantId);
    return NextResponse.json(utilization);
  } catch (error) {
    if ((error as Error).message === 'Asset not found') {
      return notFoundResponse('Asset not found');
    }
    throw error;
  }
}, { requireAuth: true, requireModule: 'assets' });
