/**
 * @file route.ts
 * @description Single asset request CRUD API endpoints (GET, DELETE)
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { canCancelRequest } from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getAssetRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
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
            location: true,
            serial: true,
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
            email: true,
          },
        },
        processedByUser: {
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

    // Non-admin can only view their own requests
    const isAdmin = session.user.role === Role.ADMIN;
    if (!isAdmin && assetRequest.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(assetRequest);
}

export const GET = withErrorHandler(getAssetRequestHandler, { requireAuth: true, requireModule: 'assets' });

async function deleteAssetRequestHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
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

    // Check if user can cancel
    const isRequester = assetRequest.userId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isAdmin && !canCancelRequest(assetRequest.status, assetRequest.type, isRequester)) {
      return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 400 });
    }

    // Cancel the request
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
