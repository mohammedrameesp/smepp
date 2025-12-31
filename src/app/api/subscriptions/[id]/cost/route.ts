/**
 * @file route.ts
 * @description Subscription total cost calculation endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateTotalCost } from '@/lib/subscription-lifecycle';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getSubscriptionCostHandler(_request: NextRequest, context: APIContext) {
    const { params } = context;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const costBreakdown = await calculateTotalCost(id);

    return NextResponse.json(costBreakdown);
}

export const GET = withErrorHandler(getSubscriptionCostHandler, { requireAuth: true, requireModule: 'subscriptions' });
