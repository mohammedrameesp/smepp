import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { canCancelRequest } from '@/lib/domains/operations/asset-requests/asset-request-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const assetRequest = await prisma.assetRequest.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Asset request GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset request' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const assetRequest = await prisma.assetRequest.findUnique({
      where: { id },
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
  } catch (error) {
    console.error('Asset request DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel asset request' },
      { status: 500 }
    );
  }
}
