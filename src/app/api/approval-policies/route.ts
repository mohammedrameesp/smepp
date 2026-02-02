/**
 * @module api/approval-policies
 * @description API endpoints for managing approval policies. Policies define the
 * approval workflow rules for different modules (leave requests, spend requests,
 * asset requests). Each policy specifies conditions (amount ranges, day ranges)
 * and approval levels with required approver roles.
 *
 * @endpoints
 * - GET /api/approval-policies - List all policies with optional filtering by module/status
 * - POST /api/approval-policies - Create a new approval policy with approval levels
 *
 * @authentication Required (Admin only via requireAdmin)
 * @tenancy Tenant-scoped - All operations filtered by authenticated tenant
 */
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

/*
 * CODE REVIEW SUMMARY
 * ===================
 *
 * Purpose:
 * CRUD endpoints for approval policies. GET lists policies with filters;
 * POST creates new policies with associated approval levels.
 *
 * Strengths:
 * - Transaction used for atomic policy + levels creation
 * - Activity logging for audit trail
 * - Proper validation schemas for both list query and create body
 * - Levels created with correct ordering
 * - Good response with included levels for immediate UI use
 *
 * Potential Improvements:
 * - GET: Query validation errors are silently ignored; could log or return 400
 * - GET: Consider pagination for large policy sets
 * - POST: Consider validating levelOrder uniqueness within the levels array
 * - POST: Could check for overlapping policy conditions (amount/day ranges)
 *
 * Security:
 * - Tenant context enforced on all operations
 * - Admin-only access via requireAdmin
 * - TenantPrismaClient auto-filters by tenant
 * - tenantId explicitly set on created records (belt and suspenders)
 *
 * Testing Considerations:
 * - Test list filtering by module and isActive
 * - Test policy creation with multiple levels
 * - Test validation errors for malformed requests
 * - Test audit log entries are created
 */
