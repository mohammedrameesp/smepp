/**
 * @file route.ts
 * @description Asset request statistics API endpoint
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getAssetRequestStatsHandler(_request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const isAdmin = session.user.role === Role.ADMIN;

    if (isAdmin) {
      // Admin stats - all pending items needing admin action (tenant-scoped)
      const [pendingRequests, pendingReturns, pendingAssignments] = await Promise.all([
        prisma.assetRequest.count({
          where: { tenantId, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
        }),
        prisma.assetRequest.count({
          where: { tenantId, status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
        }),
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
      // User stats - their pending items (tenant-scoped)
      const [myPendingAssignments, myPendingRequests, myPendingReturns] = await Promise.all([
        prisma.assetRequest.count({
          where: {
            tenantId,
            memberId: session.user.id,
            status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
          },
        }),
        prisma.assetRequest.count({
          where: {
            tenantId,
            memberId: session.user.id,
            status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
          },
        }),
        prisma.assetRequest.count({
          where: {
            tenantId,
            memberId: session.user.id,
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
}

export const GET = withErrorHandler(getAssetRequestStatsHandler, { requireAuth: true, requireModule: 'assets' });
