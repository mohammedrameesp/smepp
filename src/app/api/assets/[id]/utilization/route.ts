/**
 * @file route.ts
 * @description Asset utilization metrics API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getAssetUtilization } from '@/lib/asset-lifecycle';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getUtilizationHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
      const utilization = await getAssetUtilization(id, tenantId);
      return NextResponse.json(utilization);
    } catch (error) {
      if ((error as Error).message === 'Asset not found') {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }
      throw error;
    }
}

export const GET = withErrorHandler(getUtilizationHandler, { requireAuth: true, requireModule: 'assets' });
