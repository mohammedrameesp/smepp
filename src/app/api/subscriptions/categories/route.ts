/**
 * @file route.ts
 * @description Subscription categories autocomplete endpoint
 * @module operations/subscriptions
 *
 * Features:
 * - Returns distinct category values for autocomplete
 * - Search filtering with partial match
 * - Limited to 10 results for performance
 * - Sorted alphabetically
 * - Tenant-scoped categories only
 *
 * Endpoint:
 * - GET /api/subscriptions/categories?q=search (auth required)
 *
 * Use Cases:
 * - Autocomplete dropdowns in subscription forms
 * - Category suggestions based on existing data
 * - Consistent categorization across subscriptions
 *
 * Security:
 * - Authenticated users only
 * - Tenant isolation enforced
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

/**
 * GET /api/subscriptions/categories - Get distinct category suggestions
 *
 * Returns list of unique category values used in existing subscriptions
 * within the current tenant, filtered by search query.
 *
 * Query Parameters:
 * @param q - Optional search term for filtering categories (partial match)
 *
 * @returns Array of category strings, max 10 results, sorted alphabetically
 *
 * @example
 * GET /api/subscriptions/categories?q=soft
 * // Returns: ["Software", "Software - Cloud", "Software - Desktop"]
 *
 * @example
 * GET /api/subscriptions/categories
 * // Returns: ["Cloud", "Entertainment", "Infrastructure", ...]
 */
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
