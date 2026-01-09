/**
 * @file route.ts
 * @description Get pending approval steps for the current user
 * @module api/approval-steps
 */

import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';
import { getPendingApprovalsForUser } from '@/features/approvals/lib';

// GET /api/approval-steps - Get pending approvals for current user
export const GET = withErrorHandler(
  async (request, { prisma, tenant }) => {
    const tenantId = tenant!.tenantId;
    const userId = tenant!.userId;

    const pendingSteps = await getPendingApprovalsForUser(userId, tenantId);

    // Batch fetch entity details to avoid N+1 queries
    // Group entity IDs by type for efficient batch fetching
    const leaveRequestIds = pendingSteps
      .filter((s) => s.entityType === 'LEAVE_REQUEST')
      .map((s) => s.entityId);
    const purchaseRequestIds = pendingSteps
      .filter((s) => s.entityType === 'PURCHASE_REQUEST')
      .map((s) => s.entityId);
    const assetRequestIds = pendingSteps
      .filter((s) => s.entityType === 'ASSET_REQUEST')
      .map((s) => s.entityId);

    // Batch fetch all entities in parallel (3 queries instead of N*3)
    const [leaveRequests, purchaseRequests, assetRequests] = await Promise.all([
      leaveRequestIds.length > 0
        ? prisma.leaveRequest.findMany({
            where: { id: { in: leaveRequestIds } },
            select: {
              id: true,
              requestNumber: true,
              totalDays: true,
              startDate: true,
              endDate: true,
              member: { select: { name: true, email: true } },
              leaveType: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      purchaseRequestIds.length > 0
        ? prisma.purchaseRequest.findMany({
            where: { id: { in: purchaseRequestIds } },
            select: {
              id: true,
              referenceNumber: true,
              title: true,
              totalAmount: true,
              currency: true,
              requester: { select: { name: true, email: true } },
            },
          })
        : Promise.resolve([]),
      assetRequestIds.length > 0
        ? prisma.assetRequest.findMany({
            where: { id: { in: assetRequestIds } },
            select: {
              id: true,
              requestNumber: true,
              type: true,
              member: { select: { name: true, email: true } },
              asset: { select: { assetTag: true, model: true, type: true, priceQAR: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    // Create lookup maps for O(1) access
    const leaveRequestMap = new Map(leaveRequests.map((lr) => [lr.id, lr]));
    const purchaseRequestMap = new Map(purchaseRequests.map((pr) => [pr.id, pr]));
    const assetRequestMap = new Map(assetRequests.map((ar) => [ar.id, ar]));

    // Enrich steps with entity details (no additional queries)
    const enrichedSteps = pendingSteps.map((step) => {
      let entityDetails: Record<string, unknown> = {};

      if (step.entityType === 'LEAVE_REQUEST') {
        const leaveRequest = leaveRequestMap.get(step.entityId);
        if (leaveRequest) {
          entityDetails = {
            requestNumber: leaveRequest.requestNumber,
            requesterName: leaveRequest.member?.name || leaveRequest.member?.email,
            leaveType: leaveRequest.leaveType?.name,
            totalDays: leaveRequest.totalDays,
            startDate: leaveRequest.startDate,
            endDate: leaveRequest.endDate,
          };
        }
      } else if (step.entityType === 'PURCHASE_REQUEST') {
        const purchaseRequest = purchaseRequestMap.get(step.entityId);
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
        const assetRequest = assetRequestMap.get(step.entityId);
        if (assetRequest) {
          entityDetails = {
            requestNumber: assetRequest.requestNumber,
            requesterName: assetRequest.member?.name || assetRequest.member?.email,
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
    });

    return NextResponse.json(enrichedSteps);
  },
  {
    requireAuth: true,
    rateLimit: true,
  }
);
