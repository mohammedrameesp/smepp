/**
 * @file route.ts
 * @description Generate next employee code for the organization
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function getNextCodeHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const { tenantId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;

  // Get organization's code prefix (e.g., "ORG", "JAS", "INC")
  const codePrefix = await getOrganizationCodePrefix(tenantId);

  // Generate employee code: {PREFIX}-YYYY-XXX (e.g., ORG-2024-001, JAS-2024-001)
  const year = new Date().getFullYear();
  const prefix = `${codePrefix}-${year}`;

  // Count only within the current tenant (tenant-scoped via extension)
  const count = await db.teamMember.count({
    where: {
      isEmployee: true,
      employeeCode: { startsWith: prefix }
    }
  });

  const nextCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;

  return NextResponse.json({ nextCode });
}

export const GET = withErrorHandler(getNextCodeHandler, { requireAuth: true });
