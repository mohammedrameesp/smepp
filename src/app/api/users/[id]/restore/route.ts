/**
 * @file route.ts
 * @description Restore soft-deleted user endpoint
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// POST /api/users/[id]/restore - Restore a soft-deleted user
async function restoreUserHandler(
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

  // Verify target user belongs to the same organization (tenant-scoped via extension, check deleted users too)
  const teamMember = await db.teamMember.findFirst({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isDeleted: true,
      deletedAt: true,
      scheduledDeletionAt: true,
    },
  });

  if (!teamMember) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check if user is actually soft-deleted
  if (!teamMember.isDeleted) {
    return NextResponse.json(
      { error: 'User is not deleted and does not need to be restored' },
      { status: 400 }
    );
  }

  // Restore TeamMember - clear all soft-delete fields and re-enable login
  await db.teamMember.update({
    where: { id: teamMember.id },
    data: {
      isDeleted: false,
      deletedAt: null,
      scheduledDeletionAt: null,
      status: 'ACTIVE',
      canLogin: true, // Re-enable login
      dateOfLeaving: null, // Clear leaving date (resumes calculations)
    },
  });

  // Log activity
  await logAction(
    tenantId,
    tenant.userId,
    ActivityActions.USER_UPDATED,
    'TeamMember',
    teamMember.id,
    {
      userName: teamMember.name,
      userEmail: teamMember.email,
      action: 'restored',
      restoredFrom: {
        deletedAt: teamMember.deletedAt?.toISOString(),
        scheduledDeletionAt: teamMember.scheduledDeletionAt?.toISOString(),
      },
    }
  );

  return NextResponse.json({
    message: 'Employee restored successfully',
    details: 'The employee has been reactivated. All calculations (gratuity, service days) will continue from their original joining date with no gap.',
    user: {
      id: teamMember.id,
      name: teamMember.name,
      email: teamMember.email,
    },
  });
}

export const POST = withErrorHandler(restoreUserHandler, { requireAdmin: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None needed - file has JSDoc, admin-only authorization, proper soft-delete
 *          restoration logic, re-enables login, clears leaving date, activity logging
 * Issues: None - user restoration is secure and well-documented
 */
