/**
 * @file route.ts
 * @description User CRUD operations by ID (get, update, delete)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, TeamMemberRole } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().optional(),
  // role field updates approvalRole (for approval authority: EMPLOYEE, MANAGER, HR_MANAGER, etc.)
  role: z.nativeEnum(Role).optional(),
  // isAdmin field updates TeamMemberRole (for dashboard access: true = ADMIN, false = MEMBER)
  isAdmin: z.boolean().optional(),
});

// Transform the data for TeamMember updates
function transformUpdateData(data: { name?: string; role?: Role; isAdmin?: boolean }) {
  return {
    ...(data.name && { name: data.name }),
    ...(data.role && { approvalRole: data.role }), // Update approval authority
    ...(data.isAdmin !== undefined && { role: (data.isAdmin ? 'ADMIN' : 'MEMBER') as TeamMemberRole }), // Update dashboard access
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
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

    // Verify target user is a team member of the organization
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        tenantId,
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isEmployee: true,
        dateOfJoining: true,
        gender: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(teamMember);

  } catch (error) {
    console.error('User GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
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

    // Verify target user is a team member of the organization
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        tenantId,
        id,
        isDeleted: false,
      },
    });

    if (!existingMember) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const updateData = transformUpdateData(validation.data);

    // Update team member
    const member = await prisma.teamMember.update({
      where: { id },
      data: updateData,
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.USER_UPDATED,
      'TeamMember',
      member.id,
      { userName: member.name, userEmail: member.email, changes: updateData }
    );

    return NextResponse.json(member);

  } catch (error) {
    console.error('User PUT error:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
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

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Verify target is a team member of the organization
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        tenantId,
        id,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isOwner: true,
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of owners
    if (teamMember.isOwner) {
      return NextResponse.json(
        {
          error: 'Cannot delete organization owner',
          details: 'Transfer ownership before deleting this account'
        },
        { status: 403 }
      );
    }

    // Check if user has assigned items in this tenant
    if (teamMember._count.assets > 0 || teamMember._count.subscriptions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete user with assigned assets or subscriptions',
          details: {
            assignedAssets: teamMember._count.assets,
            assignedSubscriptions: teamMember._count.subscriptions
          }
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Soft-delete team member (7-day recovery period before permanent deletion)
    await prisma.teamMember.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: now,
        scheduledDeletionAt,
        dateOfLeaving: now, // Set leaving date (stops gratuity/service calculations)
        canLogin: false, // Block login immediately
      },
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.USER_DELETED,
      'TeamMember',
      teamMember.id,
      {
        userName: teamMember.name,
        userEmail: teamMember.email,
        softDelete: true,
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
      }
    );

    return NextResponse.json({
      message: 'Employee scheduled for deletion',
      details: 'The employee has been deactivated and will be permanently deleted in 7 days. You can restore them during this period.',
      user: {
        id: teamMember.id,
        name: teamMember.name,
        email: teamMember.email,
      },
      scheduledDeletionAt: scheduledDeletionAt.toISOString(),
    });

  } catch (error) {
    console.error('User DELETE error:', error);
    if (error instanceof Error && error.message.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}