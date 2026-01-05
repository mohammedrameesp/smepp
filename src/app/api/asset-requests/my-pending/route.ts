/**
 * @file route.ts
 * @description User's pending asset requests API endpoint
 * @module api/asset-requests/my-pending
 *
 * FEATURES:
 * - Get current user's pending assignments (awaiting their response)
 * - Get current user's pending requests (awaiting admin response)
 * - Returns counts for badge display
 *
 * USE CASES:
 * - Employee dashboard "My Pending Items" widget
 * - Notification badge count
 * - Quick action list for pending approvals
 *
 * RESPONSE STRUCTURE:
 * - pendingAssignments: Assets assigned TO user, waiting for accept/decline
 * - pendingRequests: User's requests waiting for admin approval
 * - counts: Summary counts for UI badges
 *
 * SECURITY:
 * - Auth required
 * - Returns only current user's requests
 * - Tenant-isolated
 * - Assets module must be enabled
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/asset-requests/my-pending - Get User's Pending Requests
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the current user's pending asset requests.
 *
 * Returns two categories:
 * 1. pendingAssignments: Assignments waiting for user to accept/decline
 *    (status: PENDING_USER_ACCEPTANCE)
 * 2. pendingRequests: User's own requests waiting for admin
 *    (status: PENDING_ADMIN_APPROVAL, PENDING_RETURN_APPROVAL)
 *
 * @route GET /api/asset-requests/my-pending
 *
 * @returns {Object} Pending items organized by category with counts
 *
 * @throws {403} Organization context required
 *
 * @example Response:
 * {
 *   "pendingAssignments": [
 *     {
 *       "id": "clx...",
 *       "requestNumber": "AR-25-001",
 *       "asset": { "assetTag": "BCE-CP-25001", "model": "MacBook Pro" },
 *       "assignedByMember": { "name": "Admin User" }
 *     }
 *   ],
 *   "pendingRequests": [
 *     {
 *       "id": "cly...",
 *       "requestNumber": "AR-25-002",
 *       "asset": { "assetTag": "BCE-MN-25003", "model": "Dell Monitor" }
 *     }
 *   ],
 *   "counts": {
 *     "assignments": 1,
 *     "requests": 1,
 *     "total": 2
 *   }
 * }
 */
async function getMyPendingRequestsHandler(_request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Get user's pending assignments (awaiting their response)
    // These are assignments TO the user that need accept/decline
    // ─────────────────────────────────────────────────────────────────────────────
    const pendingAssignments = await prisma.assetRequest.findMany({
      where: {
        tenantId,
        memberId: session.user.id,
        status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
      },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            model: true,
            brand: true,
            type: true,
            configuration: true,
            location: true,
          },
        },
        assignedByMember: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Get user's pending requests (awaiting admin response)
    // These are requests BY the user waiting for admin approval
    // ─────────────────────────────────────────────────────────────────────────────
    const pendingRequests = await prisma.assetRequest.findMany({
      where: {
        tenantId,
        memberId: session.user.id,
        status: {
          in: [
            AssetRequestStatus.PENDING_ADMIN_APPROVAL,
            AssetRequestStatus.PENDING_RETURN_APPROVAL,
          ],
        },
      },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            model: true,
            brand: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Return organized response with counts for UI badges
    // ─────────────────────────────────────────────────────────────────────────────
    return NextResponse.json({
      pendingAssignments,
      pendingRequests,
      counts: {
        assignments: pendingAssignments.length,
        requests: pendingRequests.length,
        total: pendingAssignments.length + pendingRequests.length,
      },
    });
}

export const GET = withErrorHandler(getMyPendingRequestsHandler, { requireAuth: true, requireModule: 'assets' });
