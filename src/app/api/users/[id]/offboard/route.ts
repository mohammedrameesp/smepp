/**
 * @file route.ts
 * @description API endpoint for employee offboarding operations
 * @module api/users/[id]/offboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { offboardEmployeeSchema } from '@/features/employees/validations/offboarding';

// POST /api/users/[id]/offboard - Offboard an employee
async function offboardUserHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId, userId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Prevent self-offboarding
  if (userId === id) {
    return NextResponse.json(
      { error: 'Cannot offboard your own account' },
      { status: 400 }
    );
  }

  // Verify target is a team member of the organization
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
      status: true,
      dateOfJoining: true,
    },
  });

  if (!teamMember) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Prevent offboarding of owners
  if (teamMember.isOwner) {
    return NextResponse.json(
      {
        error: 'Cannot offboard organization owner',
        details: 'Transfer ownership before offboarding this account',
      },
      { status: 403 }
    );
  }

  // Prevent offboarding already offboarded or terminated employees
  if (teamMember.status === 'OFFBOARDED' || teamMember.status === 'TERMINATED') {
    return NextResponse.json(
      { error: `Employee is already ${teamMember.status.toLowerCase()}` },
      { status: 400 }
    );
  }

  // Parse and validate request body
  const body = await request.json();
  const validation = offboardEmployeeSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { lastWorkingDay, reason, notes } = validation.data;
  const leavingDate = new Date(lastWorkingDay);

  // Validate leaving date is not before joining date
  if (teamMember.dateOfJoining && leavingDate < teamMember.dateOfJoining) {
    return NextResponse.json(
      { error: 'Last working day cannot be before date of joining' },
      { status: 400 }
    );
  }

  const now = new Date();
  const isImmediateOffboard = leavingDate <= now;

  // Update team member
  const updatedMember = await db.teamMember.update({
    where: { id },
    data: {
      status: 'OFFBOARDED',
      dateOfLeaving: leavingDate,
      offboardingReason: reason,
      offboardingNotes: notes || null,
      offboardedAt: now,
      offboardedByMemberId: userId,
      // Only disable login if the leaving date has passed
      canLogin: !isImmediateOffboard,
    },
  });

  // Log activity
  await logAction(
    tenantId,
    userId,
    ActivityActions.USER_OFFBOARDED,
    'TeamMember',
    teamMember.id,
    {
      userName: teamMember.name,
      userEmail: teamMember.email,
      lastWorkingDay,
      reason,
      notes,
    }
  );

  return NextResponse.json({
    message: 'Employee offboarded successfully',
    employee: {
      id: updatedMember.id,
      name: updatedMember.name,
      email: updatedMember.email,
      status: updatedMember.status,
      dateOfLeaving: updatedMember.dateOfLeaving,
      offboardingReason: updatedMember.offboardingReason,
    },
  });
}

export const POST = withErrorHandler(offboardUserHandler, { requireAdmin: true });

// DELETE /api/users/[id]/offboard - Cancel offboarding and restore employee
async function cancelOffboardingHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, params, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId, userId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Verify target is a team member
  const teamMember = await db.teamMember.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });

  if (!teamMember) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Only allow cancelling offboarding for OFFBOARDED employees
  if (teamMember.status !== 'OFFBOARDED') {
    return NextResponse.json(
      { error: 'Employee is not offboarded' },
      { status: 400 }
    );
  }

  // Restore employee to ACTIVE status
  const updatedMember = await db.teamMember.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      dateOfLeaving: null,
      offboardingReason: null,
      offboardingNotes: null,
      offboardedAt: null,
      offboardedByMemberId: null,
      canLogin: true,
    },
  });

  // Log activity
  await logAction(
    tenantId,
    userId,
    ActivityActions.USER_OFFBOARDING_CANCELLED,
    'TeamMember',
    teamMember.id,
    {
      userName: teamMember.name,
      userEmail: teamMember.email,
    }
  );

  return NextResponse.json({
    message: 'Offboarding cancelled successfully',
    employee: {
      id: updatedMember.id,
      name: updatedMember.name,
      email: updatedMember.email,
      status: updatedMember.status,
    },
  });
}

export const DELETE = withErrorHandler(cancelOffboardingHandler, { requireAdmin: true });
