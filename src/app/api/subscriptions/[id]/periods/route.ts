/**
 * @file route.ts
 * @description Subscription active billing periods endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActivePeriods } from '@/lib/subscription-lifecycle';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getSubscriptionPeriodsHandler(_request: NextRequest, context: APIContext) {
    const { params } = context;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const periods = await getActivePeriods(id);

    return NextResponse.json({ periods });
}

export const GET = withErrorHandler(getSubscriptionPeriodsHandler, { requireAuth: true, requireModule: 'subscriptions' });
