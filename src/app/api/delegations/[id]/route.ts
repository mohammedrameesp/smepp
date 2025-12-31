import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { updateDelegationSchema } from '@/lib/validations/system/approvals';
import { logAction } from '@/lib/activity';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/delegations/[id] - Get a single delegation
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;

    // Use findFirst with tenantId to prevent cross-tenant access
    const delegation = await prisma.approverDelegation.findFirst({
      where: { id, tenantId },
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
    const isAdmin = session.user.role === Role.ADMIN;
    const isInvolved =
      delegation.delegatorId === session.user.id ||
      delegation.delegateeId === session.user.id;

    if (!isAdmin && !isInvolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(delegation);
  } catch (error) {
    console.error('Get delegation error:', error);
    return NextResponse.json(
      { error: 'Failed to get delegation' },
      { status: 500 }
    );
  }
}

// PATCH /api/delegations/[id] - Update a delegation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;
    const body = await request.json();
    const validation = updateDelegationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const existing = await prisma.approverDelegation.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
    }

    // Only delegator or admin can update
    const isAdmin = session.user.role === Role.ADMIN;
    if (!isAdmin && existing.delegatorId !== session.user.id) {
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

    const delegation = await prisma.approverDelegation.update({
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
      session.user.id,
      'DELEGATION_UPDATED',
      'ApproverDelegation',
      delegation.id,
      {
        changes: validation.data,
      }
    );

    return NextResponse.json(delegation);
  } catch (error) {
    console.error('Update delegation error:', error);
    return NextResponse.json(
      { error: 'Failed to update delegation' },
      { status: 500 }
    );
  }
}

// DELETE /api/delegations/[id] - Delete a delegation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { id } = await params;

    // Use findFirst with tenantId to prevent cross-tenant access
    const existing = await prisma.approverDelegation.findFirst({
      where: { id, tenantId },
      include: {
        delegatee: { select: { name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Delegation not found' }, { status: 404 });
    }

    // Only delegator or admin can delete
    const isAdmin = session.user.role === Role.ADMIN;
    if (!isAdmin && existing.delegatorId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.approverDelegation.delete({
      where: { id },
    });

    await logAction(
      tenantId,
      session.user.id,
      'DELEGATION_DELETED',
      'ApproverDelegation',
      id,
      {
        delegateeName: existing.delegatee?.name,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete delegation error:', error);
    return NextResponse.json(
      { error: 'Failed to delete delegation' },
      { status: 500 }
    );
  }
}
