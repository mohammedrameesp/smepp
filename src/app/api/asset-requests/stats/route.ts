/**
 * @file route.ts
 * @description Asset request statistics API endpoint
 * @module api/asset-requests/stats
 *
 * FEATURES:
 * - Returns request counts by status
 * - Role-based response (admin vs regular user)
 * - Admins see org-wide pending counts
 * - Users see only their own pending counts
 *
 * USE CASES:
 * - Dashboard statistics widgets
 * - Notification badge counts
 * - Admin workqueue indicators
 * - User pending items summary
 *
 * ADMIN VIEW:
 * - pendingRequests: Employee requests needing approval
 * - pendingReturns: Return requests needing approval
 * - pendingAssignments: Assignments waiting user response
 * - totalPendingAdmin: Sum of items admin can action
 *
 * USER VIEW:
 * - pendingAssignments: Assignments waiting for their response
 * - pendingRequests: Their requests waiting for admin
 * - pendingReturns: Their return requests waiting for admin
 *
 * SECURITY:
 * - Auth required
 * - Role-based response filtering
 * - Tenant-isolated counts
 * - Assets module must be enabled
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/asset-requests/stats - Get Request Statistics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get asset request statistics based on user role.
 *
 * Admins get organization-wide counts of items needing action.
 * Regular users get counts of their own pending items.
 *
 * @route GET /api/asset-requests/stats
 *
 * @returns {Object} Request counts by status category
 *
 * @throws {403} Tenant context required
 *
 * @example Admin Response:
 * {
 *   "pendingRequests": 5,
 *   "pendingReturns": 2,
 *   "pendingAssignments": 3,
 *   "totalPendingAdmin": 7,
 *   "totalPending": 10
 * }
 *
 * @example User Response:
 * {
 *   "pendingAssignments": 1,
 *   "pendingRequests": 2,
 *   "pendingReturns": 0,
 *   "totalPending": 3
 * }
 */
export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const isAdmin = tenant!.isAdmin;

  if (isAdmin) {
      // ─────────────────────────────────────────────────────────────────────────────
      // ADMIN VIEW: Organization-wide pending counts
      // Shows items that need admin action or attention
      // ─────────────────────────────────────────────────────────────────────────────
      const [pendingRequests, pendingReturns, pendingAssignments] = await Promise.all([
        // Employee requests waiting for admin approval
        prisma.assetRequest.count({
          where: { tenantId, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
        }),
        // Return requests waiting for admin approval
        prisma.assetRequest.count({
          where: { tenantId, status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
        }),
        // Assignments waiting for user acceptance (FYI for admin)
        prisma.assetRequest.count({
          where: { tenantId, status: AssetRequestStatus.PENDING_USER_ACCEPTANCE },
        }),
      ]);

      return NextResponse.json({
        pendingRequests,
        pendingReturns,
        pendingAssignments,
        totalPendingAdmin: pendingRequests + pendingReturns,
        totalPending: pendingRequests + pendingReturns + pendingAssignments,
      });
    } else {
      // ─────────────────────────────────────────────────────────────────────────────
      // USER VIEW: Only their own pending items
      // Shows what the user needs to respond to or is waiting on
      // ─────────────────────────────────────────────────────────────────────────────
      const [myPendingAssignments, myPendingRequests, myPendingReturns] = await Promise.all([
        // Assignments waiting for this user to accept/decline
        prisma.assetRequest.count({
          where: {
            tenantId,
            memberId: userId,
            status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
          },
        }),
        // This user's requests waiting for admin approval
        prisma.assetRequest.count({
          where: {
            tenantId,
            memberId: userId,
            status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
          },
        }),
        // This user's return requests waiting for admin approval
        prisma.assetRequest.count({
          where: {
            tenantId,
            memberId: userId,
            status: AssetRequestStatus.PENDING_RETURN_APPROVAL,
          },
        }),
      ]);

    return NextResponse.json({
      pendingAssignments: myPendingAssignments,
      pendingRequests: myPendingRequests,
      pendingReturns: myPendingReturns,
      totalPending: myPendingAssignments + myPendingRequests + myPendingReturns,
    });
  }
}, { requireAuth: true, requireModule: 'assets' });
