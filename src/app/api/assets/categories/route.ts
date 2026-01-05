/**
 * @file route.ts
 * @description Asset categories autocomplete API endpoint
 * @module api/assets/categories
 *
 * FEATURES:
 * - Get distinct category values from existing assets
 * - Search/filter categories by query string
 * - Limited to 10 suggestions for performance
 *
 * USE CASE:
 * Used by asset form category autocomplete field to suggest
 * existing categories that have been used before.
 *
 * NOTE: This returns the legacy `category` string field values.
 * For the new category system, use /api/asset-categories endpoint.
 *
 * SECURITY:
 * - Auth required
 * - Assets module must be enabled
 * - Tenant-isolated results
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/categories - Get Distinct Categories
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get distinct asset category values for autocomplete suggestions.
 * Searches existing category values from this tenant's assets.
 *
 * @route GET /api/assets/categories
 *
 * @query {string} [q] - Optional search query to filter categories
 *
 * @returns {{ categories: string[] }} Array of matching category strings (max 10)
 *
 * @throws {403} Organization context required
 *
 * @example Request:
 * GET /api/assets/categories?q=comp
 *
 * @example Response:
 * { "categories": ["Computing", "Computer Accessories"] }
 */
async function getCategoriesHandler(request: NextRequest, _context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Get optional search query
    // ─────────────────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Get distinct categories from existing assets
    // ─────────────────────────────────────────────────────────────────────────────
    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Extract and filter categories
    // ─────────────────────────────────────────────────────────────────────────────
    let categories = assets
      .map((asset) => asset.category)
      .filter((cat): cat is string => cat !== null);

    // Filter by search query (case-insensitive)
    if (query) {
      const lowerQuery = query.toLowerCase();
      categories = categories.filter((category) => category.toLowerCase().includes(lowerQuery));
    }

    // Limit to 10 suggestions for performance
    categories = categories.slice(0, 10);

    return NextResponse.json({ categories });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getCategoriesHandler, { requireAuth: true, requireModule: 'assets' });
