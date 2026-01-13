/**
 * @file route.ts
 * @description Asset history retrieval API endpoint
 * @module api/assets/[id]/history
 *
 * FEATURES:
 * - Retrieve complete audit trail for an asset
 * - Assignment history (who had the asset, when)
 * - Location changes
 * - Status changes
 * - Update records with field-level changes
 *
 * HISTORY TYPES:
 * - CREATED: Asset was created
 * - ASSIGNED: Asset assigned to team member
 * - UNASSIGNED: Asset unassigned from member
 * - UPDATED: Asset properties changed
 * - LOCATION_CHANGED: Asset moved to new location
 * - MAINTENANCE: Maintenance performed
 *
 * SECURITY:
 * - Auth required
 * - Assets module must be enabled
 * - Tenant-filtered results
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getAssetHistory } from '@/features/assets';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/[id]/history - Get Asset History Timeline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the complete history timeline for an asset.
 * Returns all changes, assignments, and events in chronological order.
 *
 * Supports bi-temporal ordering:
 * - orderBy=effective (default): Order by when events actually occurred
 * - orderBy=recorded: Order by when events were entered in system
 *
 * @route GET /api/assets/[id]/history
 * @query {string} orderBy - Order by 'effective' (when it happened) or 'recorded' (when entered). Defaults to 'effective'.
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @returns {AssetHistory[]} Array of history records sorted by date
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 *
 * @example Response:
 * [
 *   {
 *     "id": "clx...",
 *     "action": "CREATED",
 *     "effectiveDate": "2025-01-01T00:00:00.000Z",
 *     "createdAt": "2025-01-05T00:00:00.000Z",
 *     "performedBy": { "name": "Admin", "email": "admin@..." }
 *   },
 *   {
 *     "id": "clx...",
 *     "action": "ASSIGNED",
 *     "toMember": { "name": "John", "email": "john@..." },
 *     "effectiveDate": "2025-01-15T00:00:00.000Z",
 *     "createdAt": "2025-01-15T00:00:00.000Z"
 *   }
 * ]
 */
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


    // ─────────────────────────────────────────────────────────────────────────────
    // Fetch asset history (tenant filtering handled by the service function)
    // ─────────────────────────────────────────────────────────────────────────────
    const history = await getAssetHistory(id, tenantId);

    return NextResponse.json(history);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getAssetHistoryHandler, { requireAuth: true, requireModule: 'assets' });
