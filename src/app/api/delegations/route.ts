import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { createDelegationSchema } from '@/features/approvals/validations/approvals';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { prisma as globalPrisma } from '@/lib/core/prisma';

// Roles that can have delegations (uses approvalRole field exposed as session.user.role)
const APPROVER_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.HR_MANAGER, Role.FINANCE_MANAGER, Role.DIRECTOR];

// GET /api/delegations - List delegations
async function getDelegationsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const userId = tenant.userId;
  const isAdmin = tenant.userRole === 'ADMIN';

  const { searchParams } = new URL(request.url);
  const viewAll = searchParams.get('all') === 'true';

  // Build filter - always include tenantId
  const filter: Record<string, unknown> = {};

  // Non-admins can only see their own delegations
  if (!isAdmin || !viewAll) {
    filter.OR = [
      { delegatorId: userId },
      { delegateeId: userId },
    ];
  }

  const delegations = await db.approverDelegation.findMany({
    where: filter,
    include: {
      delegator: {
        select: { id: true, name: true, email: true, role: true },
      },
      delegatee: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(delegations);
}

export const GET = withErrorHandler(getDelegationsHandler, { requireAuth: true });

// POST /api/delegations - Create a new delegation
async function createDelegationHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;

  // Only users with approver roles can create delegations
  // Note: We need to get the approvalRole from the team member
  const currentMember = await globalPrisma.teamMember.findFirst({
    where: { id: userId, tenantId },
    select: { approvalRole: true },
  });

  if (!currentMember?.approvalRole || !APPROVER_ROLES.includes(currentMember.approvalRole as Role)) {
    return NextResponse.json(
      { error: 'Only users with approver roles can create delegations' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const validation = createDelegationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { delegateeId, startDate, endDate, reason } = validation.data;

  // Verify delegatee exists and belongs to same organization
  // Note: TeamMember is not in TENANT_MODELS, so we use globalPrisma with explicit tenantId
  const delegatee = await globalPrisma.teamMember.findFirst({
    where: {
      id: delegateeId,
      tenantId,
      isDeleted: false,
    },
    select: { id: true, name: true, role: true },
  });

  if (!delegatee) {
    return NextResponse.json({ error: 'Delegatee not found in this organization' }, { status: 404 });
  }

  // TeamMember role is ADMIN or MEMBER - only ADMIN can be delegated to
  if (delegatee.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Delegatee must have an admin role' },
      { status: 400 }
    );
  }

  // Can't delegate to yourself
  if (delegateeId === userId) {
    return NextResponse.json(
      { error: 'Cannot delegate to yourself' },
      { status: 400 }
    );
  }

  // Check for overlapping active delegations
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  const overlapping = await db.approverDelegation.findFirst({
    where: {
      delegatorId: userId,
      isActive: true,
      OR: [
        {
          startDate: { lte: endDateObj },
          endDate: { gte: startDateObj },
        },
      ],
    },
  });

  if (overlapping) {
    return NextResponse.json(
      { error: 'You already have an active delegation during this period' },
      { status: 400 }
    );
  }

  const delegation = await db.approverDelegation.create({
    data: {
      delegatorId: userId,
      delegateeId,
      startDate: startDateObj,
      endDate: endDateObj,
      reason,
      isActive: true,
      tenantId,
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
    'DELEGATION_CREATED',
    'ApproverDelegation',
    delegation.id,
    {
      delegateeName: delegatee.name,
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      reason,
    }
  );

  return NextResponse.json(delegation, { status: 201 });
}

export const POST = withErrorHandler(createDelegationHandler, { requireAuth: true });
