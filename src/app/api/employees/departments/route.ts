/**
 * @file route.ts
 * @description Get unique departments for autocomplete (tenant-scoped)
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function getDepartmentsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Get unique non-null departments from team members
  const teamMembers = await db.teamMember.findMany({
    where: {
      department: { not: null },
    },
    select: {
      department: true,
    },
    distinct: ['department'],
    orderBy: {
      department: 'asc',
    },
  });

  // Extract unique departments and filter out nulls/empty strings
  const departments = teamMembers
    .map((tm) => tm.department)
    .filter((d): d is string => !!d && d.trim() !== '');

  return NextResponse.json({ departments });
}

export const GET = withErrorHandler(getDepartmentsHandler, { requireAuth: true });
