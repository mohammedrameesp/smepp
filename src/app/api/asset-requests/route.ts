/**
 * @file route.ts
 * @description Asset requests list and creation API endpoints
 * @module api/asset-requests
 *
 * FEATURES:
 * - List all asset requests with filtering and pagination
 * - Create new asset requests (employee request, employee return request)
 * - Search across request numbers, assets, members, and reasons
 * - Role-based access (non-admins see only their own requests)
 *
 * REQUEST TYPES:
 * - EMPLOYEE_REQUEST: Employee requests to be assigned an asset
 * - RETURN_REQUEST: Employee requests to return an assigned asset
 *
 * NOTE: ADMIN_ASSIGNMENT is now handled via /api/assets/[id]/assign
 * which provides a unified check-in/check-out workflow with conditional
 * acceptance based on user type (canLogin flag).
 *
 * REQUEST LIFECYCLE:
 * - Employee Request: PENDING_ADMIN_APPROVAL → APPROVED/REJECTED
 * - Return Request: PENDING_RETURN_APPROVAL → APPROVED/REJECTED
 *
 * SECURITY:
 * - Auth required for all operations
 * - Non-admins can only view/create their own requests
 * - Assets module must be enabled
 * - Tenant-isolated data
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import {
  createAssetRequestSchema,
  createReturnRequestSchema,
  assetRequestQuerySchema,
} from '@/features/asset-requests';
import { logAction, ActivityActions } from '@/lib/core/activity';
import {
  generateRequestNumber,
  canRequestAsset,
  canReturnAsset,
} from '@/features/asset-requests';
import { sendAssetRequestNotifications } from '@/features/asset-requests';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/asset-requests - List Asset Requests (Most Used)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get paginated list of asset requests with filtering.
 * Non-admin users can only see their own requests.
 *
 * @route GET /api/asset-requests
 *
 * @query {string} [q] - Search query (request number, asset, member, reason)
 * @query {AssetRequestType} [type] - Filter by request type
 * @query {AssetRequestStatus} [status] - Filter by status
 * @query {string} [memberId] - Filter by member (admin only)
 * @query {string} [assetId] - Filter by asset
 * @query {number} [p=1] - Page number
 * @query {number} [ps=20] - Page size
 * @query {string} [sort=createdAt] - Sort field
 * @query {string} [order=desc] - Sort order
 *
 * @returns {{ requests: AssetRequest[], pagination: PaginationMeta }}
 *
 * @example Response:
 * {
 *   "requests": [
 *     {
 *       "id": "clx...",
 *       "requestNumber": "AR-25-001",
 *       "type": "EMPLOYEE_REQUEST",
 *       "status": "PENDING_ADMIN_APPROVAL",
 *       "asset": { "assetTag": "ORG-CP-25001", "model": "MacBook Pro" },
 *       "member": { "name": "John Doe", "email": "john@example.com" }
 *     }
 *   ],
 *   "pagination": { "page": 1, "pageSize": 20, "total": 50, "totalPages": 3 }
 * }
 */
async function getAssetRequestsHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Parse and validate query parameters
    // ─────────────────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = assetRequestQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { q, type, status, memberId: filterMemberId, assetId, p, ps, sort, order } = validation.data;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Apply role-based access control
    // Non-admin users can only see their own requests
    // ─────────────────────────────────────────────────────────────────────────────
    const isAdmin = tenant!.orgRole === 'OWNER' || tenant!.orgRole === 'ADMIN';
    const effectiveMemberId = isAdmin ? filterMemberId : currentUserId;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Build where clause with filters
    // ─────────────────────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { tenantId };

    if (effectiveMemberId) {
      where.memberId = effectiveMemberId;
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (q) {
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { asset: { model: { contains: q, mode: 'insensitive' } } },
        { asset: { assetTag: { contains: q, mode: 'insensitive' } } },
        { member: { name: { contains: q, mode: 'insensitive' } } },
        { member: { email: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Execute paginated query with related data
    // ─────────────────────────────────────────────────────────────────────────────
    const skip = (p - 1) * ps;

    const [requests, total] = await Promise.all([
      prisma.assetRequest.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              model: true,
              brand: true,
              type: true,
              status: true,
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
            },
          },
          processedByMember: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { [sort]: order },
        take: ps,
        skip,
      }),
      prisma.assetRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
}

export const GET = withErrorHandler(getAssetRequestsHandler, { requireAuth: true, requireModule: 'assets' });

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/asset-requests - Create Asset Request
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new asset request based on type.
 *
 * Types:
 * - EMPLOYEE_REQUEST: Employee requests an available asset (default)
 * - RETURN_REQUEST: Employee requests to return assigned asset
 *
 * NOTE: For admin assignments, use POST /api/assets/[id]/assign instead.
 * That endpoint provides check-in/check-out with conditional acceptance.
 *
 * @route POST /api/asset-requests
 *
 * @body {string} assetId - Target asset ID
 * @body {AssetRequestType} [type] - Request type (default: EMPLOYEE_REQUEST)
 * @body {string} [reason] - Request reason
 * @body {string} [notes] - Additional notes
 *
 * @returns {AssetRequest} Created request with asset and member info
 *
 * @throws {400} Invalid request body
 * @throws {400} Cannot request/return this asset (validation failed)
 * @throws {400} Admin assignment not supported (use /api/assets/[id]/assign)
 * @throws {404} Asset not found
 *
 * @example EMPLOYEE_REQUEST body:
 * { "assetId": "clx...", "reason": "Need for project work" }
 *
 * @example RETURN_REQUEST body:
 * { "type": "RETURN_REQUEST", "assetId": "clx...", "reason": "Project completed" }
 */
async function createAssetRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;

    const body = await request.json();
    const requestType = body.type as AssetRequestType | undefined;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Determine request type and validate accordingly
    // ─────────────────────────────────────────────────────────────────────────────
    let validatedData;
    let assetId: string;
    let memberId: string;
    let reason: string | null = null;
    let notes: string | null = null;
    let type: AssetRequestType;
    let status: AssetRequestStatus;
    let activityAction: string;

    if (requestType === AssetRequestType.ADMIN_ASSIGNMENT) {
      // ─────────────────────────────────────────────────────────────────────────────
      // ADMIN_ASSIGNMENT: Redirect to /api/assets/[id]/assign
      // ─────────────────────────────────────────────────────────────────────────────
      return NextResponse.json({
        error: 'Admin assignment is now handled via /api/assets/[id]/assign',
        hint: 'Use POST /api/assets/{assetId}/assign with { assignedMemberId: memberId }',
      }, { status: 400 });

    } else if (requestType === AssetRequestType.RETURN_REQUEST) {
      // ─────────────────────────────────────────────────────────────────────────────
      // RETURN_REQUEST: User requesting to return asset
      // ─────────────────────────────────────────────────────────────────────────────
      const validation = createReturnRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      memberId = currentUserId;
      reason = validatedData.reason;
      notes = validatedData.notes || null;
      type = AssetRequestType.RETURN_REQUEST;
      status = AssetRequestStatus.PENDING_RETURN_APPROVAL;
      activityAction = ActivityActions.ASSET_RETURN_REQUESTED;

      // Check if user can return this asset (tenant-scoped)
      const canReturn = await canReturnAsset(assetId, memberId, tenantId);
      if (!canReturn.canReturn) {
        return NextResponse.json({ error: canReturn.reason }, { status: 400 });
      }

    } else {
      // ─────────────────────────────────────────────────────────────────────────────
      // EMPLOYEE_REQUEST: Employee requesting asset (default)
      // ─────────────────────────────────────────────────────────────────────────────
      const validation = createAssetRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      memberId = currentUserId;
      reason = validatedData.reason;
      notes = validatedData.notes || null;
      type = AssetRequestType.EMPLOYEE_REQUEST;
      status = AssetRequestStatus.PENDING_ADMIN_APPROVAL;
      activityAction = ActivityActions.ASSET_REQUEST_CREATED;

      // Check if user can request this asset (tenant-scoped)
      const canRequest = await canRequestAsset(assetId, memberId, tenantId);
      if (!canRequest.canRequest) {
        return NextResponse.json({ error: canRequest.reason }, { status: 400 });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Verify asset exists and belongs to tenant
    // ─────────────────────────────────────────────────────────────────────────────
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      select: { assetTag: true, model: true, brand: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Create request in transaction with history entry
    // ─────────────────────────────────────────────────────────────────────────────
    const assetRequest = await prisma.$transaction(async (tx) => {
      // Generate unique request number (AR-YY-NNNN format)
      const requestNumber = await generateRequestNumber(tenantId, tx);

      const newRequest = await tx.assetRequest.create({
        data: {
          tenantId,
          requestNumber,
          type,
          status,
          assetId,
          memberId,
          reason,
          notes,
          // Note: assignedById is only set for ADMIN_ASSIGNMENT which is now
          // handled via /api/assets/[id]/assign
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
          member: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create initial history entry
      await tx.assetRequestHistory.create({
        data: {
          assetRequestId: newRequest.id,
          action: 'CREATED',
          newStatus: status,
          performedById: currentUserId,
        },
      });

      return newRequest;
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Log activity
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
      currentUserId,
      activityAction,
      'AssetRequest',
      assetRequest.id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: asset.assetTag,
        assetModel: asset.model,
        type,
        status,
      }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Send notifications (non-blocking)
    // ─────────────────────────────────────────────────────────────────────────────
    try {
      await sendAssetRequestNotifications({
        tenantId,
        currentUserId,
        assetRequest: {
          ...assetRequest,
          user: assetRequest.member,
        },
        asset,
        type,
        reason,
        notes,
        targetUserId: memberId,
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(assetRequest, { status: 201 });
}

export const POST = withErrorHandler(createAssetRequestHandler, { requireAuth: true, requireModule: 'assets' });
