/**
 * @file route.ts
 * @description Single asset request API endpoints (GET, DELETE)
 * @module api/asset-requests/[id]
 *
 * FEATURES:
 * - Get single request with full details and history
 * - Cancel/delete pending requests
 * - Role-based access control
 *
 * SECURITY:
 * - Auth required
 * - Non-admins can only view/cancel their own requests
 * - Tenant-isolated (prevents cross-tenant access)
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
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canCancelRequest } from '@/features/asset-requests';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/asset-requests/[id] - Get Single Request (Most Used)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a single asset request by ID with full details.
 * Includes asset info, member info, processor info, and history timeline.
 *
 * @route GET /api/asset-requests/[id]
 *
 * @param {string} id - Request ID (path parameter)
 *
 * @returns {AssetRequest} Request with all related data and history
 *
 * @throws {400} ID is required
 * @throws {403} Tenant context required
 * @throws {403} Access denied (non-admin viewing other's request)
 * @throws {404} Asset request not found
 *
 * @example Response:
 * {
 *   "id": "clx...",
 *   "requestNumber": "AR-25-001",
 *   "type": "EMPLOYEE_REQUEST",
 *   "status": "APPROVED",
 *   "asset": { "assetTag": "ORG-CP-25001", "model": "MacBook Pro", ... },
 *   "member": { "name": "John Doe", "email": "john@example.com" },
 *   "processedByMember": { "name": "Admin User" },
 *   "history": [
 *     { "action": "APPROVED", "createdAt": "2025-01-05T...", "performedBy": { "name": "Admin" } }
 *   ]
 * }
 */
async function getAssetRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Fetch request with all related data
    // Use findFirst with tenantId to prevent cross-tenant access (IDOR prevention)
    // ─────────────────────────────────────────────────────────────────────────────
    const assetRequest = await prisma.assetRequest.findFirst({
      where: { id, tenantId },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            model: true,
            brand: true,
            type: true,
            status: true,
            configuration: true,
            serial: true,
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedByMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        processedByMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        history: {
          include: {
            performedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Check access permissions
    // Non-admin users can only view their own requests
    // ─────────────────────────────────────────────────────────────────────────────
    const isAdmin = session.user.isAdmin;
    if (!isAdmin && assetRequest.memberId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(assetRequest);
}

export const GET = withErrorHandler(getAssetRequestHandler, { requireAuth: true, requireModule: 'assets' });

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/asset-requests/[id] - Cancel Request
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cancel/delete an asset request.
 * Sets status to CANCELLED and creates history entry.
 *
 * Rules:
 * - Admins can cancel any pending request
 * - Users can cancel their own pending requests (based on type and status)
 *
 * @route DELETE /api/asset-requests/[id]
 *
 * @param {string} id - Request ID (path parameter)
 *
 * @returns {{ success: boolean, message: string }}
 *
 * @throws {400} ID is required
 * @throws {400} Cannot cancel this request (invalid state)
 * @throws {403} Tenant context required
 * @throws {404} Asset request not found
 *
 * @example Response:
 * { "success": true, "message": "Request cancelled" }
 */
async function deleteAssetRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Fetch request (tenant-scoped for IDOR prevention)
    // ─────────────────────────────────────────────────────────────────────────────
    const assetRequest = await prisma.assetRequest.findFirst({
      where: { id, tenantId },
      include: {
        asset: {
          select: { assetTag: true, model: true },
        },
      },
    });

    if (!assetRequest) {
      return NextResponse.json({ error: 'Asset request not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Check if user can cancel this request
    // ─────────────────────────────────────────────────────────────────────────────
    const isRequester = assetRequest.memberId === session.user.id;
    const isAdmin = session.user.isAdmin;

    if (!isAdmin && !canCancelRequest(assetRequest.status, assetRequest.type, isRequester)) {
      return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Cancel request in transaction
    // ─────────────────────────────────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.assetRequest.update({
        where: { id },
        data: {
          status: AssetRequestStatus.CANCELLED,
          processedById: session.user.id,
          processedAt: new Date(),
        },
      });

      await tx.assetRequestHistory.create({
        data: {
          assetRequestId: id,
          action: 'CANCELLED',
          oldStatus: assetRequest.status,
          newStatus: AssetRequestStatus.CANCELLED,
          performedById: session.user.id,
        },
      });
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_REQUEST_CANCELLED,
      'AssetRequest',
      id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: assetRequest.asset.assetTag,
        previousStatus: assetRequest.status,
      }
    );

    return NextResponse.json({ success: true, message: 'Request cancelled' });
}

export const DELETE = withErrorHandler(deleteAssetRequestHandler, { requireAuth: true, requireModule: 'assets' });
