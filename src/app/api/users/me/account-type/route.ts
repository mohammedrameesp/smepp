/**
 * @file route.ts
 * @description Account type confirmation endpoints - allows owners to confirm whether
 *              their account is a personal employee account or a service/shared account
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { z } from 'zod';

const updateAccountTypeSchema = z.object({
  isEmployee: z.boolean(),
});

// GET /api/users/me/account-type - Get current account type status
async function getAccountTypeHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const member = await db.teamMember.findFirst({
    where: {
      id: tenant.userId,
    },
    select: {
      id: true,
      email: true,
      isOwner: true,
      isEmployee: true,
      accountTypeConfirmed: true,
      accountTypeConfirmedAt: true,
    },
  });

  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: member.id,
    email: member.email,
    isOwner: member.isOwner,
    isEmployee: member.isEmployee,
    accountTypeConfirmed: member.accountTypeConfirmed,
    accountTypeConfirmedAt: member.accountTypeConfirmedAt,
  });
}

export const GET = withErrorHandler(getAccountTypeHandler, { requireAuth: true });

// PATCH /api/users/me/account-type - Update account type and mark as confirmed
async function updateAccountTypeHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 400 });
  }

  const body = await request.json();
  const validation = updateAccountTypeSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const { isEmployee } = validation.data;
  const db = tenantPrisma as TenantPrismaClient;

  // Verify the current user is an owner (only owners can confirm their account type)
  const currentMember = await db.teamMember.findFirst({
    where: {
      id: tenant.userId,
    },
    select: {
      id: true,
      isOwner: true,
      isEmployee: true,
      employeeCode: true,
    },
  });

  if (!currentMember) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  if (!currentMember.isOwner) {
    return NextResponse.json(
      { error: 'Only organization owners can confirm their account type' },
      { status: 403 }
    );
  }

  // Update the member's account type
  const updateData: {
    isEmployee: boolean;
    accountTypeConfirmed: boolean;
    accountTypeConfirmedAt: Date;
    isOnWps?: boolean;
    employeeCode?: string | null;
  } = {
    isEmployee,
    accountTypeConfirmed: true,
    accountTypeConfirmedAt: new Date(),
  };

  // If switching to service account, clear employee-specific fields
  if (!isEmployee) {
    updateData.isOnWps = false;
    updateData.employeeCode = null;
  } else {
    // Generate employee code if confirming as employee and don't have one yet
    if (!currentMember.employeeCode) {
      const codePrefix = await getOrganizationCodePrefix(tenant.tenantId);
      const year = new Date().getFullYear();
      const prefix = `${codePrefix}-${year}`;

      const count = await db.teamMember.count({
        where: {
          isEmployee: true,
          employeeCode: { startsWith: prefix },
        },
      });

      updateData.employeeCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
  }

  const updatedMember = await db.teamMember.update({
    where: { id: currentMember.id },
    data: updateData,
    select: {
      id: true,
      email: true,
      isOwner: true,
      isEmployee: true,
      isOnWps: true,
      employeeCode: true,
      accountTypeConfirmed: true,
      accountTypeConfirmedAt: true,
    },
  });

  // Log the action
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.USER_UPDATED,
    'TeamMember',
    updatedMember.id,
    {
      field: 'accountType',
      previousValue: currentMember.isEmployee ? 'employee' : 'service',
      newValue: isEmployee ? 'employee' : 'service',
    }
  );

  return NextResponse.json({
    success: true,
    user: updatedMember,
    message: isEmployee
      ? 'Account confirmed as personal employee account'
      : 'Account confirmed as service/shared account',
  });
}

export const PATCH = withErrorHandler(updateAccountTypeHandler, { requireAuth: true });
