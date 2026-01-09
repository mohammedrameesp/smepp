import { NextRequest, NextResponse } from 'next/server';
import { createApprovalPolicySchema, listPoliciesQuerySchema } from '@/features/approvals/validations/approvals';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/approval-policies - List all policies
async function getApprovalPoliciesHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const { searchParams } = new URL(request.url);
  const queryResult = listPoliciesQuerySchema.safeParse({
    module: searchParams.get('module') || undefined,
    isActive: searchParams.get('isActive') || undefined,
  });

  const filter: Record<string, unknown> = {};
  if (queryResult.success) {
    if (queryResult.data.module) {
      filter.module = queryResult.data.module;
    }
    if (queryResult.data.isActive !== undefined) {
      filter.isActive = queryResult.data.isActive;
    }
  }

  const policies = await db.approvalPolicy.findMany({
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
}

export const GET = withErrorHandler(getApprovalPoliciesHandler, { requireAdmin: true });

// POST /api/approval-policies - Create a new policy
async function createApprovalPolicyHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;

  const body = await request.json();
  const validation = createApprovalPolicySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { levels, ...policyData } = validation.data;

  // Create policy with levels in a transaction
  const policy = await db.$transaction(async (tx) => {
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
        tenantId,
        levels: {
          create: levels.map((level) => ({
            levelOrder: level.levelOrder,
            approverRole: level.approverRole,
            tenantId,
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
    tenantId,
    userId,
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
}

export const POST = withErrorHandler(createApprovalPolicyHandler, { requireAdmin: true });
