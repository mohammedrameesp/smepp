/**
 * @file route.ts
 * @description Asset history retrieval API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getAssetHistory } from '@/lib/domains/operations/assets/asset-history';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getAssetHistoryHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get asset history (with tenant filtering)
    const history = await getAssetHistory(id, tenantId);

    return NextResponse.json(history);
}

export const GET = withErrorHandler(getAssetHistoryHandler, { requireAuth: true, requireModule: 'assets' });