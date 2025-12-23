import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role, AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === Role.ADMIN;

    if (isAdmin) {
      // Admin stats - all pending items needing admin action
      const [pendingRequests, pendingReturns, pendingAssignments] = await Promise.all([
        prisma.assetRequest.count({
          where: { status: AssetRequestStatus.PENDING_ADMIN_APPROVAL },
        }),
        prisma.assetRequest.count({
          where: { status: AssetRequestStatus.PENDING_RETURN_APPROVAL },
        }),
        prisma.assetRequest.count({
          where: { status: AssetRequestStatus.PENDING_USER_ACCEPTANCE },
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
      // User stats - their pending items
      const [myPendingAssignments, myPendingRequests, myPendingReturns] = await Promise.all([
        prisma.assetRequest.count({
          where: {
            userId: session.user.id,
            status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
          },
        }),
        prisma.assetRequest.count({
          where: {
            userId: session.user.id,
            status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
          },
        }),
        prisma.assetRequest.count({
          where: {
            userId: session.user.id,
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
  } catch (error) {
    console.error('Asset request stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
