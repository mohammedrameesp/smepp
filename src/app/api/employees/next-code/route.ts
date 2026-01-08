/**
 * @file route.ts
 * @description Generate next employee code for the organization
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

async function getNextCodeHandler(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Get organization's code prefix (e.g., "ORG", "JAS", "INC")
    const codePrefix = await getOrganizationCodePrefix(tenantId);

    // Generate employee code: {PREFIX}-YYYY-XXX (e.g., ORG-2024-001, JAS-2024-001)
    const year = new Date().getFullYear();
    const prefix = `${codePrefix}-${year}`;

    // Count only within the current tenant
    const count = await prisma.teamMember.count({
      where: {
        tenantId,
        isEmployee: true,
        employeeCode: { startsWith: prefix }
      }
    });

    const nextCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;

    return NextResponse.json({ nextCode });
}

export const GET = getNextCodeHandler;
