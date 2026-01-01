import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { updateApprovalPolicySchema } from '@/lib/validations/system/approvals';
import { logAction, ActivityActions } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/approval-policies/[id] - Get a single policy
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;

    // Use findFirst with tenantId to prevent cross-tenant access
    const policy = await prisma.approvalPolicy.findFirst({
      where: { id, tenantId },
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
  } catch (error) {
    console.error('Get approval policy error:', error);
    return NextResponse.json(
      { error: 'Failed to get approval policy' },
      { status: 500 }
    );
  }
}

// PATCH /api/approval-policies/[id] - Update a policy
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    const body = await request.json();
    const validation = updateApprovalPolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const existing = await prisma.approvalPolicy.findFirst({
      where: { id, tenantId },
      include: { levels: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const { levels, ...updateData } = validation.data;

    // Update policy with optional levels in a transaction
    const policy = await prisma.$transaction(async (tx) => {
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
          })),
        });
      }

      // Update the policy
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
      session.user.id,
      ActivityActions.APPROVAL_POLICY_UPDATED,
      'ApprovalPolicy',
      policy.id,
      {
        name: policy.name,
        module: policy.module,
        changes: validation.data,
      }
    );

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Update approval policy error:', error);
    return NextResponse.json(
      { error: 'Failed to update approval policy' },
      { status: 500 }
    );
  }
}

// DELETE /api/approval-policies/[id] - Delete a policy
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;

    // Use findFirst with tenantId to prevent cross-tenant access
    const existing = await prisma.approvalPolicy.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Check if policy is in use (has active approval steps)
    const activeStepsCount = await prisma.approvalStep.count({
      where: {
        status: 'PENDING',
        // We need to check if any steps were created from this policy
        // Since we don't have a direct relation, we can't easily check this
        // For now, allow deletion (levels will cascade delete)
      },
    });

    // Note: In production, you might want to check if this policy
    // has any active approval chains before allowing deletion

    await prisma.approvalPolicy.delete({
      where: { id },
    });

    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.APPROVAL_POLICY_DELETED,
      'ApprovalPolicy',
      id,
      {
        name: existing.name,
        module: existing.module,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete approval policy error:', error);
    return NextResponse.json(
      { error: 'Failed to delete approval policy' },
      { status: 500 }
    );
  }
}
