/**
 * @file route.ts
 * @description Asset locations autocomplete API endpoint
 * @module api/assets/locations
 *
 * FEATURES:
 * - Get distinct location values from existing assets
 * - Search/filter locations by query string
 * - Limited to 10 suggestions for performance
 *
 * USE CASE:
 * Used by asset form location field to suggest existing locations
 * that have been used before (e.g., "Office A", "Warehouse B").
 *
 * BENEFITS:
 * - Reduces typos in location names
 * - Ensures consistency across assets
 * - Makes filtering by location more reliable
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
// GET /api/assets/locations - Get Distinct Locations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get distinct asset location values for autocomplete suggestions.
 * Searches existing location values from this tenant's assets.
 *
 * @route GET /api/assets/locations
 *
 * @query {string} [q] - Optional search query to filter locations
 *
 * @returns {{ locations: string[] }} Array of matching location strings (max 10)
 *
 * @throws {403} Organization context required
 *
 * @example Request:
 * GET /api/assets/locations?q=office
 *
 * @example Response:
 * { "locations": ["Main Office", "Branch Office", "Home Office"] }
 */
async function getLocationsHandler(request: NextRequest, _context: APIContext) {
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
    // STEP 2: Get distinct locations from existing assets
    // ─────────────────────────────────────────────────────────────────────────────
    const assets = await prisma.asset.findMany({
      where: {
        tenantId,
        location: {
          not: null,
        },
      },
      select: {
        location: true,
      },
      distinct: ['location'],
      orderBy: {
        location: 'asc',
      },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Extract and filter locations
    // ─────────────────────────────────────────────────────────────────────────────
    let locations = assets
      .map((asset) => asset.location)
      .filter((loc): loc is string => loc !== null);

    // Filter by search query (case-insensitive)
    if (query) {
      const lowerQuery = query.toLowerCase();
      locations = locations.filter((location) => location.toLowerCase().includes(lowerQuery));
    }

    // Limit to 10 suggestions for performance
    locations = locations.slice(0, 10);

    return NextResponse.json({ locations });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getLocationsHandler, { requireAuth: true, requireModule: 'assets' });
