import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';
import { ApprovalModule } from '@prisma/client';
import { getApprovalChain, getApprovalChainSummary } from '@/features/approvals/lib';

// GET /api/approval-steps/by-entity/[entityType]/[entityId] - Get approval chain for an entity
export const GET = withErrorHandler(async (request: NextRequest, { params }) => {
  const entityType = params?.entityType;
  const entityId = params?.entityId;

  if (!entityType || !entityId) {
    return badRequestResponse('Entity type and ID are required');
  }

  // Validate entityType
  if (!['LEAVE_REQUEST', 'PURCHASE_REQUEST', 'ASSET_REQUEST'].includes(entityType)) {
    return badRequestResponse('Invalid entity type');
  }

  const chain = await getApprovalChain(entityType as ApprovalModule, entityId);
  const summary = await getApprovalChainSummary(entityType as ApprovalModule, entityId);

  return NextResponse.json({
    steps: chain,
    summary,
  });
}, { requireAuth: true });
