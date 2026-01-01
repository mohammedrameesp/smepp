/**
 * @file route.ts
 * @description User CRUD operations by ID (get, update, delete)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Verify target user belongs to the same organization
    const membership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch user with HR profile (relations are now on TeamMember, not User)
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        hrProfile: {
          select: {
            dateOfJoining: true,
            gender: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);

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
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Verify target user belongs to the same organization
    const membership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: id,
        },
      },
    });

    if (!membership) {
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

    const data = validation.data;

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data,
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.USER_UPDATED,
      'User',
      user.id,
      { userName: user.name, userEmail: user.email, changes: data }
    );

    return NextResponse.json(user);

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
    if (!session || session.user.role !== Role.ADMIN) {
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

    // Verify target user belongs to the same organization
    const membership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tenantId,
          userId: id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user details before deletion for logging
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        isSystemAccount: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of system accounts
    if (user.isSystemAccount) {
      return NextResponse.json(
        {
          error: 'Cannot delete system account',
          details: 'System accounts like "Shared Resources" are protected and cannot be deleted'
        },
        { status: 403 }
      );
    }

    // Check if user has a TeamMember record with assigned assets/subscriptions
    // First, find the TeamMember for this user in this tenant
    const teamMember = await prisma.teamMember.findFirst({
      where: { email: user.email, tenantId },
      select: { id: true },
    });

    let assignedAssets = 0;
    let assignedSubscriptions = 0;

    if (teamMember) {
      // SECURITY: Count assigned items filtered by tenant to prevent cross-tenant data leakage
      [assignedAssets, assignedSubscriptions] = await Promise.all([
        prisma.asset.count({
          where: { assignedMemberId: teamMember.id, tenantId },
        }),
        prisma.subscription.count({
          where: { assignedMemberId: teamMember.id, tenantId },
        }),
      ]);
    }

    // Check if user has assigned items in this tenant
    if (assignedAssets > 0 || assignedSubscriptions > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete user with assigned assets or subscriptions',
          details: {
            assignedAssets,
            assignedSubscriptions
          }
        },
        { status: 409 }
      );
    }

    const now = new Date();
    const scheduledDeletionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Soft-delete user (7-day recovery period before permanent deletion)
    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: now,
        scheduledDeletionAt,
        deletedByUserId: session.user.id,
        canLogin: false, // Block login immediately
      },
    });

    // Set termination date on HR profile if exists (stops gratuity/service calculations)
    await prisma.hRProfile.updateMany({
      where: { userId: id },
      data: {
        terminationDate: now,
      },
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.USER_DELETED,
      'User',
      user.id,
      {
        userName: user.name,
        userEmail: user.email,
        softDelete: true,
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
      }
    );

    return NextResponse.json({
      message: 'Employee scheduled for deletion',
      details: 'The employee has been deactivated and will be permanently deleted in 7 days. You can restore them during this period.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
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