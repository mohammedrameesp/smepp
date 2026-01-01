import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createDelegationSchema } from '@/lib/validations/system/approvals';
import { logAction } from '@/lib/activity';

// Roles that can have delegations
const APPROVER_ROLES: Role[] = ['MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'];

// GET /api/delegations - List delegations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const isAdmin = session.user.role === Role.ADMIN;
    const { searchParams } = new URL(request.url);
    const viewAll = searchParams.get('all') === 'true';

    // Build filter - always include tenantId
    const filter: Record<string, unknown> = { tenantId };

    // Non-admins can only see their own delegations
    if (!isAdmin || !viewAll) {
      filter.OR = [
        { delegatorId: session.user.id },
        { delegateeId: session.user.id },
      ];
    }

    const delegations = await prisma.approverDelegation.findMany({
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
  } catch (error) {
    console.error('List delegations error:', error);
    return NextResponse.json(
      { error: 'Failed to list delegations' },
      { status: 500 }
    );
  }
}

// POST /api/delegations - Create a new delegation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Only users with approver roles can create delegations
    if (!APPROVER_ROLES.includes(session.user.role as Role)) {
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
    const tenantId = session.user.organizationId;

    // Verify delegatee exists and belongs to same organization
    const delegatee = await prisma.teamMember.findFirst({
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
    if (delegateeId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delegate to yourself' },
        { status: 400 }
      );
    }

    // Check for overlapping active delegations
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const overlapping = await prisma.approverDelegation.findFirst({
      where: {
        delegatorId: session.user.id,
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

    const delegation = await prisma.approverDelegation.create({
      data: {
        delegatorId: session.user.id,
        delegateeId,
        startDate: startDateObj,
        endDate: endDateObj,
        reason,
        isActive: true,
        tenantId: session.user.organizationId,
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
      session.user.id,
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
  } catch (error) {
    console.error('Create delegation error:', error);
    return NextResponse.json(
      { error: 'Failed to create delegation' },
      { status: 500 }
    );
  }
}
