/**
 * @file route.ts
 * @description Asset types autocomplete API endpoint
 * @module api/assets/types
 *
 * FEATURES:
 * - Get distinct type values from existing assets
 * - Search/filter types by query string
 * - Limited to 10 suggestions for performance
 *
 * USE CASE:
 * Used by asset form type field to suggest existing asset types
 * (e.g., "Laptop", "Monitor", "Desk", "Chair").
 *
 * BENEFITS:
 * - Reduces typos in type names
 * - Ensures consistency in asset categorization
 * - Makes filtering by type more reliable
 *
 * NOTE: For type-to-category mapping suggestions,
 * see /api/asset-types/suggestions endpoint.
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
// GET /api/assets/types - Get Distinct Asset Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get distinct asset type values for autocomplete suggestions.
 * Searches existing type values from this tenant's assets.
 *
 * @route GET /api/assets/types
 *
 * @query {string} [q] - Optional search query to filter types
 *
 * @returns {{ types: string[] }} Array of matching type strings (max 10)
 *
 * @throws {403} Organization context required
 *
 * @example Request:
 * GET /api/assets/types?q=lap
 *
 * @example Response:
 * { "types": ["Laptop", "Laptop Stand", "Laptop Bag"] }
 */
async function getTypesHandler(request: NextRequest, _context: APIContext) {
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
    // STEP 2: Get distinct types from existing assets
    // ─────────────────────────────────────────────────────────────────────────────
    const assets = await prisma.asset.findMany({
      where: { tenantId },
      select: {
        type: true,
      },
      distinct: ['type'],
      orderBy: {
        type: 'asc',
      },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Extract and filter types
    // ─────────────────────────────────────────────────────────────────────────────
    let types = assets.map((asset) => asset.type);

    // Filter by search query (case-insensitive)
    if (query) {
      const lowerQuery = query.toLowerCase();
      types = types.filter((type) => type.toLowerCase().includes(lowerQuery));
    }

    // Limit to 10 suggestions for performance
    types = types.slice(0, 10);

    return NextResponse.json({ types });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getTypesHandler, { requireAuth: true, requireModule: 'assets' });
