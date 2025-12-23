import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AssetRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's pending assignments (waiting for them to accept/decline)
    const pendingAssignments = await prisma.assetRequest.findMany({
      where: {
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
  } catch (error) {
    console.error('My pending requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending requests' },
      { status: 500 }
    );
  }
}
