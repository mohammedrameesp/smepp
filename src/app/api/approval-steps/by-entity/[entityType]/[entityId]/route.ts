import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { ApprovalModule } from '@prisma/client';
import { getApprovalChain, getApprovalChainSummary } from '@/features/approvals/lib';

interface RouteParams {
  params: Promise<{ entityType: string; entityId: string }>;
}

// GET /api/approval-steps/by-entity/[entityType]/[entityId] - Get approval chain for an entity
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entityType, entityId } = await params;

    // Validate entityType
    if (!['LEAVE_REQUEST', 'PURCHASE_REQUEST', 'ASSET_REQUEST'].includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }

    const chain = await getApprovalChain(entityType as ApprovalModule, entityId);
    const summary = await getApprovalChainSummary(entityType as ApprovalModule, entityId);

    return NextResponse.json({
      steps: chain,
      summary,
    });
  } catch (error) {
    console.error('Get approval chain error:', error);
    return NextResponse.json(
      { error: 'Failed to get approval chain' },
      { status: 500 }
    );
  }
}
