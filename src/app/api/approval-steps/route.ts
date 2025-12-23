import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { getPendingApprovalsForUser } from '@/lib/domains/system/approvals';

// GET /api/approval-steps - Get pending approvals for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingSteps = await getPendingApprovalsForUser(session.user.id);

    // Enrich with entity details
    const enrichedSteps = await Promise.all(
      pendingSteps.map(async (step) => {
        let entityDetails: Record<string, unknown> = {};

        // Fetch entity details based on type
        if (step.entityType === 'LEAVE_REQUEST') {
          const { prisma } = await import('@/lib/prisma');
          const leaveRequest = await prisma.leaveRequest.findUnique({
            where: { id: step.entityId },
            select: {
              requestNumber: true,
              totalDays: true,
              startDate: true,
              endDate: true,
              user: {
                select: { name: true, email: true },
              },
              leaveType: {
                select: { name: true },
              },
            },
          });
          if (leaveRequest) {
            entityDetails = {
              requestNumber: leaveRequest.requestNumber,
              requesterName: leaveRequest.user?.name || leaveRequest.user?.email,
              leaveType: leaveRequest.leaveType?.name,
              totalDays: leaveRequest.totalDays,
              startDate: leaveRequest.startDate,
              endDate: leaveRequest.endDate,
            };
          }
        } else if (step.entityType === 'PURCHASE_REQUEST') {
          const { prisma } = await import('@/lib/prisma');
          const purchaseRequest = await prisma.purchaseRequest.findUnique({
            where: { id: step.entityId },
            select: {
              referenceNumber: true,
              title: true,
              totalAmount: true,
              currency: true,
              requester: {
                select: { name: true, email: true },
              },
            },
          });
          if (purchaseRequest) {
            entityDetails = {
              referenceNumber: purchaseRequest.referenceNumber,
              requesterName: purchaseRequest.requester?.name || purchaseRequest.requester?.email,
              title: purchaseRequest.title,
              totalAmount: purchaseRequest.totalAmount,
              currency: purchaseRequest.currency,
            };
          }
        } else if (step.entityType === 'ASSET_REQUEST') {
          const { prisma } = await import('@/lib/prisma');
          const assetRequest = await prisma.assetRequest.findUnique({
            where: { id: step.entityId },
            select: {
              requestNumber: true,
              type: true,
              user: {
                select: { name: true, email: true },
              },
              asset: {
                select: { assetTag: true, model: true, type: true, priceQAR: true },
              },
            },
          });
          if (assetRequest) {
            entityDetails = {
              requestNumber: assetRequest.requestNumber,
              requesterName: assetRequest.user?.name || assetRequest.user?.email,
              requestType: assetRequest.type,
              assetTag: assetRequest.asset?.assetTag,
              assetModel: assetRequest.asset?.model,
              assetType: assetRequest.asset?.type,
              assetValue: assetRequest.asset?.priceQAR,
            };
          }
        }

        return {
          ...step,
          entityDetails,
        };
      })
    );

    return NextResponse.json(enrichedSteps);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    return NextResponse.json(
      { error: 'Failed to get pending approvals' },
      { status: 500 }
    );
  }
}
