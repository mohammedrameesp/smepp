/**
 * @file route.ts
 * @description Enable canApprove permission for a specific team member by email
 * @module admin/enable-manager
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

const enableManagerSchema = z.object({
  email: z.string().email('Valid email required'),
});

// POST /api/admin/enable-manager - Enable canApprove for a specific user by email
async function enableManagerHandler(
  request: Request,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const body = await request.json();
  const validation = enableManagerSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = validation.data;
  const db = tenantPrisma as TenantPrismaClient;

  // Find the team member by email in this tenant
  const teamMember = await db.teamMember.findFirst({
    where: {
      email: email.toLowerCase(),
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      canApprove: true,
    },
  });

  if (!teamMember) {
    return NextResponse.json(
      { error: 'Team member not found with this email' },
      { status: 404 }
    );
  }

  if (teamMember.canApprove) {
    return NextResponse.json({
      message: 'Team member already has manager (canApprove) permission',
      user: teamMember,
    });
  }

  // Enable canApprove for this user
  const updatedMember = await db.teamMember.update({
    where: { id: teamMember.id },
    data: {
      canApprove: true,
      permissionsUpdatedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      canApprove: true,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Manager permission enabled. User should log out and back in, or wait ~60 seconds for session refresh.',
    user: updatedMember,
  });
}

export const POST = withErrorHandler(enableManagerHandler, { requireAdmin: true });
