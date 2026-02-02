/**
 * @file route.ts
 * @description User CRUD operations by ID (get, update, delete)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidBodyResponse } from '@/lib/http/responses';
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

// Permission fields that trigger session refresh when changed
const PERMISSION_FIELDS = ['isAdmin', 'hasOperationsAccess', 'hasHRAccess', 'hasFinanceAccess', 'canApprove'];

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
  let permissionsChanged = false;

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
    permissionsChanged = true;
  } else {
    // Legacy: handle individual permission flags
    if (data.isAdmin !== undefined) {
      updates.isAdmin = data.isAdmin;
      permissionsChanged = true;
    }

    if (data.isManager !== undefined) {
      updates.canApprove = data.isManager;
      permissionsChanged = true;
    }

    if (data.hasOperationsAccess !== undefined) {
      updates.hasOperationsAccess = data.hasOperationsAccess;
      permissionsChanged = true;
    }

    if (data.hasHRAccess !== undefined) {
      updates.hasHRAccess = data.hasHRAccess;
      permissionsChanged = true;
    }

    if (data.hasFinanceAccess !== undefined) {
      updates.hasFinanceAccess = data.hasFinanceAccess;
      permissionsChanged = true;
    }

    if (data.canApprove !== undefined && data.isManager === undefined) {
      updates.canApprove = data.canApprove;
      permissionsChanged = true;
    }
  }

  if (data.reportingToId !== undefined) {
    updates.reportingToId = data.reportingToId;
  }

  // Set permissionsUpdatedAt if any permission field changed
  if (permissionsChanged) {
    updates.permissionsUpdatedAt = new Date();
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
    return invalidBodyResponse(validation.error);
  }

  const updateData = transformUpdateData(validation.data);

  // Update team member (tenant-scoped via extension)
  const member = await db.teamMember.update({
    where: { id },
    data: updateData,
  });

  // Auto-enable canApprove for the manager when someone reports to them
  if (validation.data.reportingToId && validation.data.reportingToId !== existingMember.reportingToId) {
    await db.teamMember.update({
      where: { id: validation.data.reportingToId },
      data: { canApprove: true, permissionsUpdatedAt: new Date() },
    });
  }

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
          // Only count active assets (IN_USE status means assigned and in use)
          assets: {
            where: {
              status: { in: ['IN_USE', 'REPAIR'] },
            },
          },
          // Only count active subscriptions (not cancelled)
          subscriptions: {
            where: {
              status: 'ACTIVE',
            },
          },
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

  // Check if user has active assigned items in this tenant
  if (teamMember._count.assets > 0 || teamMember._count.subscriptions > 0) {
    return NextResponse.json(
      {
        error: 'Cannot delete user with active assets or subscriptions',
        details: {
          activeAssets: teamMember._count.assets,
          activeSubscriptions: teamMember._count.subscriptions,
          hint: 'Unassign or cancel these items before deleting the employee'
        }
      },
      { status: 409 }
    );
  }

  const now = new Date();
  const scheduledDeletionAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  // Soft-delete team member (30-day recovery period before permanent deletion)
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
    details: 'The employee has been deactivated and will be permanently deleted in 30 days. You can restore them during this period.',
    user: {
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
    },
    scheduledDeletionAt: scheduledDeletionAt.toISOString(),
  });
}

export const DELETE = withErrorHandler(deleteUserHandler, { requireAdmin: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None needed - file has JSDoc, comprehensive authorization (admin required),
 *          prevents self-deletion and owner deletion, soft-delete with 30-day recovery,
 *          proper validation with Zod, activity logging, tenant isolation
 * Issues: None - CRUD operations are properly secured
 */
