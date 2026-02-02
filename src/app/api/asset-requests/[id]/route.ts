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

import { NextResponse } from 'next/server';
import { AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { canCancelRequest } from '@/features/asset-requests';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/http/errors';
import {
  getApprovalChain,
  getApprovalChainSummary,
  hasApprovalChain,
} from '@/features/approvals/lib';

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
export const GET = withErrorHandler(async (_request, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const isAdmin = tenant!.isAdmin;
  const hasOperationsAccess = tenant!.hasOperationsAccess;
  const id = params?.id;
  if (!id) {
    return badRequestResponse('ID is required');
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
    return notFoundResponse('Asset request not found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Check access permissions
  // Non-admin users can only view their own requests
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isAdmin && assetRequest.memberId !== userId) {
    return forbiddenResponse('Access denied');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Include approval chain if it exists
  // ─────────────────────────────────────────────────────────────────────────────
  const chainExists = await hasApprovalChain('ASSET_REQUEST', id);
  let approvalChain = null;
  let approvalSummary = null;

  if (chainExists) {
    approvalChain = await getApprovalChain('ASSET_REQUEST', id);
    approvalSummary = await getApprovalChainSummary('ASSET_REQUEST', id);

    // Add canCurrentUserApprove flag
    if (approvalSummary?.status === 'PENDING' && approvalChain && approvalChain.length > 0) {
      const currentStep = approvalChain.find(step => step.status === 'PENDING');
      if (currentStep) {
        // Determine if current user can approve based on their role matching the step's required role
        let canCurrentUserApprove = false;

        switch (currentStep.requiredRole) {
          case 'MANAGER': {
            // Check if current user is the requester's manager
            const directReports = await prisma.teamMember.findMany({
              where: { reportingToId: userId, tenantId },
              select: { id: true },
            });
            canCurrentUserApprove = directReports.some(r => r.id === assetRequest.memberId);
            break;
          }
          case 'HR_MANAGER':
            canCurrentUserApprove = !!hasOperationsAccess;
            break;
          case 'DIRECTOR':
            // Only admins can approve director-level steps
            canCurrentUserApprove = !!isAdmin;
            break;
        }

        approvalSummary = {
          ...approvalSummary,
          canCurrentUserApprove,
        };
      }
    }
  }

  return NextResponse.json({
    ...assetRequest,
    approvalChain,
    approvalSummary,
  });
}, { requireAuth: true, requireModule: 'assets' });

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
export const DELETE = withErrorHandler(async (_request, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const isAdmin = tenant!.isAdmin;
  const id = params?.id;
  if (!id) {
    return badRequestResponse('ID is required');
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
    return notFoundResponse('Asset request not found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Check if user can cancel this request
  // ─────────────────────────────────────────────────────────────────────────────
  const isRequester = assetRequest.memberId === userId;

  if (!isAdmin && !canCancelRequest(assetRequest.status, assetRequest.type, isRequester)) {
    return badRequestResponse('Cannot cancel this request');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Cancel request in transaction
  // ─────────────────────────────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    await tx.assetRequest.update({
      where: { id },
      data: {
        status: AssetRequestStatus.CANCELLED,
        processedById: userId,
        processedAt: new Date(),
      },
    });

    await tx.assetRequestHistory.create({
      data: {
        assetRequestId: id,
        action: 'CANCELLED',
        oldStatus: assetRequest.status,
        newStatus: AssetRequestStatus.CANCELLED,
        performedById: userId,
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Log activity
  // ─────────────────────────────────────────────────────────────────────────────
  await logAction(
    tenantId,
    userId,
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
}, { requireAuth: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
