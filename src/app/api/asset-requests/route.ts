/**
 * @file route.ts
 * @description Asset requests list and creation API endpoints
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { Role, AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import {
  createAssetRequestSchema,
  createAssetAssignmentSchema,
  createReturnRequestSchema,
  assetRequestQuerySchema,
} from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import {
  generateRequestNumber,
  canRequestAsset,
  canAssignAsset,
  canReturnAsset,
} from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendAssetRequestNotifications } from '@/lib/domains/operations/asset-requests/asset-request-notifications';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getAssetRequestsHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const userRole = tenant!.userRole;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = assetRequestQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { q, type, status, userId: filterUserId, assetId, p, ps, sort, order } = validation.data;

    // Non-admin users can only see their own requests
    const isAdmin = userRole === Role.ADMIN;
    const effectiveUserId = isAdmin ? filterUserId : currentUserId;

    // Build where clause with tenant filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { tenantId };

    if (effectiveUserId) {
      where.userId = effectiveUserId;
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
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
            },
          },
          processedByUser: {
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

async function createAssetRequestHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const userRole = tenant!.userRole;

    const body = await request.json();
    const requestType = body.type as AssetRequestType | undefined;
    const isAdmin = userRole === Role.ADMIN;

    // Determine request type and validate accordingly
    let validatedData;
    let assetId: string;
    let userId: string;
    let reason: string | null = null;
    let notes: string | null = null;
    let type: AssetRequestType;
    let status: AssetRequestStatus;
    let activityAction: string;

    if (requestType === AssetRequestType.ADMIN_ASSIGNMENT) {
      // Admin assigning asset to user
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const validation = createAssetAssignmentSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      userId = validatedData.userId;
      reason = validatedData.reason || null;
      notes = validatedData.notes || null;
      type = AssetRequestType.ADMIN_ASSIGNMENT;
      status = AssetRequestStatus.PENDING_USER_ACCEPTANCE;
      activityAction = ActivityActions.ASSET_ASSIGNMENT_CREATED;

      // Check if can assign
      const canAssign = await canAssignAsset(assetId, userId);
      if (!canAssign.canAssign) {
        return NextResponse.json({ error: canAssign.reason }, { status: 400 });
      }

    } else if (requestType === AssetRequestType.RETURN_REQUEST) {
      // User requesting to return asset
      const validation = createReturnRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      userId = currentUserId;
      reason = validatedData.reason;
      notes = validatedData.notes || null;
      type = AssetRequestType.RETURN_REQUEST;
      status = AssetRequestStatus.PENDING_RETURN_APPROVAL;
      activityAction = ActivityActions.ASSET_RETURN_REQUESTED;

      // Check if can return
      const canReturn = await canReturnAsset(assetId, userId);
      if (!canReturn.canReturn) {
        return NextResponse.json({ error: canReturn.reason }, { status: 400 });
      }

    } else {
      // Employee requesting asset (default)
      const validation = createAssetRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      userId = currentUserId;
      reason = validatedData.reason;
      notes = validatedData.notes || null;
      type = AssetRequestType.EMPLOYEE_REQUEST;
      status = AssetRequestStatus.PENDING_ADMIN_APPROVAL;
      activityAction = ActivityActions.ASSET_REQUEST_CREATED;

      // Check if can request
      const canRequest = await canRequestAsset(assetId, userId);
      if (!canRequest.canRequest) {
        return NextResponse.json({ error: canRequest.reason }, { status: 400 });
      }
    }

    // Get asset info for activity log - verify asset belongs to tenant
    const asset = await prisma.asset.findFirst({
      where: { id: assetId, tenantId },
      select: { assetTag: true, model: true, brand: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Create the request in a transaction
    const assetRequest = await prisma.$transaction(async (tx) => {
      const requestNumber = await generateRequestNumber(tenantId, tx);

      const newRequest = await tx.assetRequest.create({
        data: {
          tenantId,
          requestNumber,
          type,
          status,
          assetId,
          userId,
          reason,
          notes,
          assignedById: type === AssetRequestType.ADMIN_ASSIGNMENT ? currentUserId : null,
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create history entry
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

    // Send email and in-app notifications (non-blocking)
    try {
      await sendAssetRequestNotifications({
        tenantId,
        currentUserId,
        assetRequest,
        asset,
        type,
        reason,
        notes,
        targetUserId: userId,
      });
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(assetRequest, { status: 201 });
}

export const POST = withErrorHandler(createAssetRequestHandler, { requireAuth: true, requireModule: 'assets' });
