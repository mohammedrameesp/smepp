/**
 * @file route.ts
 * @description User CRUD operations by ID (get, update, delete)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { Role, TeamMemberRole } from '@prisma/client';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
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
  const updates: Record<string, unknown> = {};

  if (data.name) {
    updates.name = data.name;
  }

  if (data.role) {
    updates.approvalRole = data.role; // Update approval authority
  }

  if (data.isAdmin !== undefined) {
    updates.role = (data.isAdmin ? 'ADMIN' : 'MEMBER') as TeamMemberRole;
    // Admin should always have approval authority
    if (data.isAdmin) {
      updates.approvalRole = 'ADMIN' as Role;
    }
  }

  return updates;
}

// GET /api/users/[id] - Get a specific user
async function getUserHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Verify target user is a team member of the organization (tenant-scoped via extension)
  const teamMember = await db.teamMember.findFirst({
    where: {
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
}

export const GET = withErrorHandler(getUserHandler, { requireAdmin: true });

// PUT /api/users/[id] - Update a specific user
async function updateUserHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Verify target user is a team member of the organization (tenant-scoped via extension)
  const existingMember = await db.teamMember.findFirst({
    where: {
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

  // Update team member (tenant-scoped via extension)
  const member = await db.teamMember.update({
    where: { id },
    data: updateData,
  });

  // Log activity
  await logAction(
    tenantId,
    tenant.userId,
    ActivityActions.USER_UPDATED,
    'TeamMember',
    member.id,
    { userName: member.name, userEmail: member.email, changes: updateData }
  );

  return NextResponse.json(member);
}

export const PUT = withErrorHandler(updateUserHandler, { requireAdmin: true });

// DELETE /api/users/[id] - Soft-delete a specific user
async function deleteUserHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Prevent self-deletion
  if (tenant.userId === id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  // Verify target is a team member of the organization (tenant-scoped via extension)
  const teamMember = await db.teamMember.findFirst({
    where: {
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
  await db.teamMember.update({
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
    tenant.userId,
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
}

export const DELETE = withErrorHandler(deleteUserHandler, { requireAdmin: true });
