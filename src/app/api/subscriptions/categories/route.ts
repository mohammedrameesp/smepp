/**
 * @file route.ts
 * @description Subscription categories autocomplete endpoint
 * @module operations/subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getCategoriesHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;

    // Get search query parameter
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get distinct categories from database
    const subscriptions = await prisma.subscription.findMany({
      where: {
        tenantId,
        category: {
          not: null,
          contains: query,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      take: 10,
    });

    // Extract unique categories and filter out nulls
    const categories = subscriptions
      .map((s) => s.category)
      .filter((c): c is string => c !== null)
      .sort();

    return NextResponse.json(categories);
}

export const GET = withErrorHandler(getCategoriesHandler, { requireAuth: true, requireModule: 'subscriptions' });
