/**
 * @file route.ts
 * @description One-time fix to enable canApprove for all existing managers
 * @module admin/fix-managers
 */

import { NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// POST /api/admin/fix-managers - Enable canApprove for all users who have direct reports
async function fixManagersHandler(
  request: Request,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Find all team members who have someone reporting to them
  const managersWithReports = await db.teamMember.findMany({
    where: {
      isDeleted: false,
      directReports: {
        some: {
          isDeleted: false,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      canApprove: true,
    },
  });

  // Update all managers to have canApprove = true
  const managersToUpdate = managersWithReports.filter(m => !m.canApprove);

  if (managersToUpdate.length === 0) {
    return NextResponse.json({
      message: 'All managers already have canApprove enabled',
      totalManagers: managersWithReports.length,
      updated: 0,
    });
  }

  await db.teamMember.updateMany({
    where: {
      id: { in: managersToUpdate.map(m => m.id) },
    },
    data: {
      canApprove: true,
      permissionsUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({
    message: 'Managers updated successfully',
    totalManagers: managersWithReports.length,
    updated: managersToUpdate.length,
    updatedManagers: managersToUpdate.map(m => ({ id: m.id, name: m.name, email: m.email })),
  });
}

export const POST = withErrorHandler(fixManagersHandler, { requireAdmin: true });
