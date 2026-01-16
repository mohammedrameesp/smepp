import { NextRequest, NextResponse } from 'next/server';
import { updateApprovalPolicySchema } from '@/features/approvals/validations/approvals';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/approval-policies/[id] - Get a single policy
async function getApprovalPolicyHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Policy ID required' }, { status: 400 });
  }

  const policy = await db.approvalPolicy.findFirst({
    where: { id },
    include: {
      levels: {
        orderBy: { levelOrder: 'asc' },
      },
    },
  });

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  return NextResponse.json(policy);
}

export const GET = withErrorHandler(getApprovalPolicyHandler, { requireAdmin: true });

// PATCH /api/approval-policies/[id] - Update a policy
async function updateApprovalPolicyHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Policy ID required' }, { status: 400 });
  }

  const body = await request.json();
  const validation = updateApprovalPolicySchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  // Verify policy exists and belongs to tenant
  const existing = await db.approvalPolicy.findFirst({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  const { levels, ...updateData } = validation.data;

  // Update policy with optional levels in a transaction
  const policy = await db.$transaction(async (tx) => {
    // If levels are provided, replace them
    if (levels) {
      // Delete existing levels
      await tx.approvalLevel.deleteMany({
        where: { policyId: id },
      });

      // Create new levels
      await tx.approvalLevel.createMany({
        data: levels.map((level) => ({
          policyId: id,
          levelOrder: level.levelOrder,
          approverRole: level.approverRole,
          tenantId,
        })),
      });
    }

    // Update the policy and increment version for audit trail
    // Version is auto-incremented on every update to track policy changes
    const updatedPolicy = await tx.approvalPolicy.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
        ...(updateData.minAmount !== undefined && { minAmount: updateData.minAmount }),
        ...(updateData.maxAmount !== undefined && { maxAmount: updateData.maxAmount }),
        ...(updateData.minDays !== undefined && { minDays: updateData.minDays }),
        ...(updateData.maxDays !== undefined && { maxDays: updateData.maxDays }),
        ...(updateData.priority !== undefined && { priority: updateData.priority }),
        version: { increment: 1 }, // Auto-increment version on every update
      },
      include: {
        levels: {
          orderBy: { levelOrder: 'asc' },
        },
      },
    });

    return updatedPolicy;
  });

  await logAction(
    tenantId,
    userId,
    ActivityActions.APPROVAL_POLICY_UPDATED,
    'ApprovalPolicy',
    policy.id,
    {
      name: policy.name,
      module: policy.module,
      version: policy.version,
      changes: validation.data,
    }
  );

  return NextResponse.json(policy);
}

export const PATCH = withErrorHandler(updateApprovalPolicyHandler, { requireAdmin: true });

// DELETE /api/approval-policies/[id] - Delete a policy
async function deleteApprovalPolicyHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Policy ID required' }, { status: 400 });
  }

  // Verify policy exists and belongs to tenant
  const existing = await db.approvalPolicy.findFirst({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  // Note: In production, you might want to check if this policy
  // has any active approval chains before allowing deletion

  await db.approvalPolicy.delete({
    where: { id },
  });

  await logAction(
    tenantId,
    userId,
    ActivityActions.APPROVAL_POLICY_DELETED,
    'ApprovalPolicy',
    id,
    {
      name: existing.name,
      module: existing.module,
    }
  );

  return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteApprovalPolicyHandler, { requireAdmin: true });
