/**
 * @file route.ts
 * @description User's pending asset requests API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getMyPendingRequestsHandler(_request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Get user's pending assignments (waiting for them to accept/decline)
    const pendingAssignments = await prisma.assetRequest.findMany({
      where: {
        tenantId,
        userId: session.user.id,
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
        assignedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user's pending requests (their requests waiting for admin)
    const pendingRequests = await prisma.assetRequest.findMany({
      where: {
        tenantId,
        userId: session.user.id,
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
