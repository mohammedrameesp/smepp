import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { createApprovalPolicySchema, listPoliciesQuerySchema } from '@/lib/validations/system/approvals';
import { logAction, ActivityActions } from '@/lib/core/activity';

// GET /api/approval-policies - List all policies
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const { searchParams } = new URL(request.url);
    const queryResult = listPoliciesQuerySchema.safeParse({
      module: searchParams.get('module') || undefined,
      isActive: searchParams.get('isActive') || undefined,
    });

    const filter: Record<string, unknown> = { tenantId };
    if (queryResult.success) {
      if (queryResult.data.module) {
        filter.module = queryResult.data.module;
      }
      if (queryResult.data.isActive !== undefined) {
        filter.isActive = queryResult.data.isActive;
      }
    }

    const policies = await prisma.approvalPolicy.findMany({
      where: filter,
      include: {
        levels: {
          orderBy: { levelOrder: 'asc' },
        },
      },
      orderBy: [
        { module: 'asc' },
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error('List approval policies error:', error);
    return NextResponse.json(
      { error: 'Failed to list approval policies' },
      { status: 500 }
    );
  }
}

// POST /api/approval-policies - Create a new policy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createApprovalPolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { levels, ...policyData } = validation.data;

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Create policy with levels in a transaction
    const policy = await prisma.$transaction(async (tx) => {
      const createdPolicy = await tx.approvalPolicy.create({
        data: {
          name: policyData.name,
          module: policyData.module,
          isActive: policyData.isActive,
          minAmount: policyData.minAmount,
          maxAmount: policyData.maxAmount,
          minDays: policyData.minDays,
          maxDays: policyData.maxDays,
          priority: policyData.priority,
          tenantId: session.user.organizationId!,
          levels: {
            create: levels.map((level) => ({
              levelOrder: level.levelOrder,
              approverRole: level.approverRole,
              tenantId: session.user.organizationId!,
            })),
          },
        },
        include: {
          levels: {
            orderBy: { levelOrder: 'asc' },
          },
        },
      });

      return createdPolicy;
    });

    await logAction(
      session.user.organizationId!,
      session.user.id,
      ActivityActions.APPROVAL_POLICY_CREATED,
      'ApprovalPolicy',
      policy.id,
      {
        name: policy.name,
        module: policy.module,
        levelsCount: levels.length,
      }
    );

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error('Create approval policy error:', error);
    return NextResponse.json(
      { error: 'Failed to create approval policy' },
      { status: 500 }
    );
  }
}
