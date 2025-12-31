/**
 * @file route.ts
 * @description Asset assignment periods API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getAssignmentPeriods } from '@/lib/asset-lifecycle';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getPeriodsHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const periods = await getAssignmentPeriods(id);

    return NextResponse.json(periods);
}

export const GET = withErrorHandler(getPeriodsHandler, { requireAuth: true, requireModule: 'assets' });
