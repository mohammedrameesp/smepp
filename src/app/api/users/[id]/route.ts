/**
 * @file route.ts
 * @description User CRUD operations by ID (get, update, delete)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';

// Role types for simplified access control
type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'HR' | 'FINANCE' | 'OPERATIONS' | 'EMPLOYEE';

// Role to permission flags mapping
const ROLE_PERMISSIONS: Record<Role, {
  isAdmin: boolean;
  canApprove: boolean;
  hasHRAccess: boolean;
  hasFinanceAccess: boolean;
  hasOperationsAccess: boolean;
}> = {
  OWNER: { isAdmin: true, canApprove: true, hasHRAccess: true, hasFinanceAccess: true, hasOperationsAccess: true },
  ADMIN: { isAdmin: true, canApprove: true, hasHRAccess: true, hasFinanceAccess: true, hasOperationsAccess: true },
  MANAGER: { isAdmin: false, canApprove: true, hasHRAccess: false, hasFinanceAccess: false, hasOperationsAccess: false },
  HR: { isAdmin: false, canApprove: false, hasHRAccess: true, hasFinanceAccess: false, hasOperationsAccess: false },
  FINANCE: { isAdmin: false, canApprove: false, hasHRAccess: false, hasFinanceAccess: true, hasOperationsAccess: false },
  OPERATIONS: { isAdmin: false, canApprove: false, hasHRAccess: false, hasFinanceAccess: false, hasOperationsAccess: true },
  EMPLOYEE: { isAdmin: false, canApprove: false, hasHRAccess: false, hasFinanceAccess: false, hasOperationsAccess: false },
};

const updateUserSchema = z.object({
  name: z.string().optional(),
  // Simplified role-based access (preferred)
  role: z.enum(['ADMIN', 'MANAGER', 'HR', 'FINANCE', 'OPERATIONS', 'EMPLOYEE']).optional(),
  // Legacy permission flags (for backwards compatibility)
  isAdmin: z.boolean().optional(),
  isManager: z.boolean().optional(),
  hasOperationsAccess: z.boolean().optional(),
  hasHRAccess: z.boolean().optional(),
  hasFinanceAccess: z.boolean().optional(),
  canApprove: z.boolean().optional(),
  // Manager relationship for approval routing
  reportingToId: z.string().nullable().optional(),
});

// Transform the data for TeamMember updates
function transformUpdateData(data: {
  name?: string;
  role?: Role;
  isAdmin?: boolean;
  isManager?: boolean;
  hasOperationsAccess?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  canApprove?: boolean;
  reportingToId?: string | null;
}) {
  const updates: Record<string, unknown> = {};

  if (data.name) {
    updates.name = data.name;
  }

  // If role is provided, use the role-based permission mapping
  if (data.role) {
    const permissions = ROLE_PERMISSIONS[data.role];
    updates.isAdmin = permissions.isAdmin;
    updates.canApprove = permissions.canApprove;
    updates.hasHRAccess = permissions.hasHRAccess;
    updates.hasFinanceAccess = permissions.hasFinanceAccess;
    updates.hasOperationsAccess = permissions.hasOperationsAccess;
  } else {
    // Legacy: handle individual permission flags
    if (data.isAdmin !== undefined) {
      updates.isAdmin = data.isAdmin;
    }

    if (data.isManager !== undefined) {
      updates.canApprove = data.isManager;
    }

    if (data.hasOperationsAccess !== undefined) {
      updates.hasOperationsAccess = data.hasOperationsAccess;
    }

    if (data.hasHRAccess !== undefined) {
      updates.hasHRAccess = data.hasHRAccess;
    }

    if (data.hasFinanceAccess !== undefined) {
      updates.hasFinanceAccess = data.hasFinanceAccess;
    }

    if (data.canApprove !== undefined && data.isManager === undefined) {
      updates.canApprove = data.canApprove;
    }
  }

  if (data.reportingToId !== undefined) {
    updates.reportingToId = data.reportingToId;
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
      isAdmin: true,
      hasOperationsAccess: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
      canApprove: true,
      reportingToId: true,
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
