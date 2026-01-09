import { NextRequest, NextResponse } from 'next/server';
import { updateDelegationSchema } from '@/features/approvals/validations/approvals';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/delegations/[id] - Get a single delegation
async function getDelegationHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const userId = tenant.userId;
  const isAdmin = tenant.userRole === 'ADMIN';
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Delegation ID required' }, { status: 400 });
  }

  const delegation = await db.approverDelegation.findFirst({
    where: { id },
    include: {
      delegator: {
        select: { id: true, name: true, email: true, role: true },
      },
      delegatee: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!delegation) {
    return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
  }

  // Only admin or involved parties can view
  const isInvolved =
    delegation.delegatorId === userId ||
    delegation.delegateeId === userId;

  if (!isAdmin && !isInvolved) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(delegation);
}

export const GET = withErrorHandler(getDelegationHandler, { requireAuth: true });

// PATCH /api/delegations/[id] - Update a delegation
async function updateDelegationHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;
  const isAdmin = tenant.userRole === 'ADMIN';
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Delegation ID required' }, { status: 400 });
  }

  const body = await request.json();
  const validation = updateDelegationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  // Verify delegation exists and belongs to tenant
  const existing = await db.approverDelegation.findFirst({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
  }

  // Only delegator or admin can update
  if (!isAdmin && existing.delegatorId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { startDate, endDate, isActive, reason } = validation.data;

  // Validate dates if being updated
  if (startDate || endDate) {
    const newStart = startDate ? new Date(startDate) : existing.startDate;
    const newEnd = endDate ? new Date(endDate) : existing.endDate;
    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }
  }

  const delegation = await db.approverDelegation.update({
    where: { id },
    data: {
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(isActive !== undefined && { isActive }),
      ...(reason !== undefined && { reason }),
    },
    include: {
      delegator: {
        select: { id: true, name: true, email: true, role: true },
      },
      delegatee: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  await logAction(
    tenantId,
    userId,
    'DELEGATION_UPDATED',
    'ApproverDelegation',
    delegation.id,
    {
      changes: validation.data,
    }
  );

  return NextResponse.json(delegation);
}

export const PATCH = withErrorHandler(updateDelegationHandler, { requireAuth: true });

// DELETE /api/delegations/[id] - Delete a delegation
async function deleteDelegationHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma, params } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;
  const isAdmin = tenant.userRole === 'ADMIN';
  const id = params?.id;

  if (!id) {
    return NextResponse.json({ error: 'Delegation ID required' }, { status: 400 });
  }

  // Verify delegation exists and belongs to tenant
  const existing = await db.approverDelegation.findFirst({
    where: { id },
    include: {
      delegatee: { select: { name: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
  }

  // Only delegator or admin can delete
  if (!isAdmin && existing.delegatorId !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.approverDelegation.delete({
    where: { id },
  });

  await logAction(
    tenantId,
    userId,
    'DELEGATION_DELETED',
    'ApproverDelegation',
    id,
    {
      delegateeName: existing.delegatee?.name,
    }
  );

  return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteDelegationHandler, { requireAuth: true });
