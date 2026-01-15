/**
 * @file route.ts
 * @description Team members list for access control management
 * @module system/team-members
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/team-members - Get all team members with permission data
async function getTeamMembersHandler(
  request: NextRequest,
  context: APIContext
) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const { searchParams } = new URL(request.url);
  const includeNonEmployees = searchParams.get('includeNonEmployees') === 'true';

  // Build where clause
  const where: Record<string, unknown> = {
    isDeleted: false,
  };

  // Filter by employee status if not including non-employees
  if (!includeNonEmployees) {
    where.isEmployee = true;
  }

  // Fetch team members with permissions and reporting relationship
  const members = await db.teamMember.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isOwner: true,
      isEmployee: true,
      canLogin: true,
      // Permission flags
      isAdmin: true,
      hasOperationsAccess: true,
      hasHRAccess: true,
      hasFinanceAccess: true,
      canApprove: true,
      // Reporting relationship
      reportingToId: true,
      reportingTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { isOwner: 'desc' },
      { isAdmin: 'desc' },
      { name: 'asc' },
    ],
  });

  // Transform the response
  const transformedMembers = members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    image: member.image,
    isOwner: member.isOwner,
    isEmployee: member.isEmployee,
    canLogin: member.canLogin,
    isAdmin: member.isAdmin,
    hasOperationsAccess: member.hasOperationsAccess,
    hasHRAccess: member.hasHRAccess,
    hasFinanceAccess: member.hasFinanceAccess,
    canApprove: member.canApprove,
    reportingTo: member.reportingTo
      ? {
          id: member.reportingTo.id,
          name: member.reportingTo.name || member.reportingTo.email,
        }
      : null,
  }));

  return NextResponse.json({
    members: transformedMembers,
    total: transformedMembers.length,
  });
}

export const GET = withErrorHandler(getTeamMembersHandler, { requireAdmin: true });
