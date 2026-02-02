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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None required - file is well-documented
 * Issues: None - tenant filtering delegated to service function, proper error handling
 */
