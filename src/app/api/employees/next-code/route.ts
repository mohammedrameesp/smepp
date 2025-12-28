import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    // Get organization's code prefix (e.g., "BCE", "JAS", "INC")
    const codePrefix = await getOrganizationCodePrefix(tenantId);

    // Generate employee code: {PREFIX}-YYYY-XXX (e.g., BCE-2024-001, JAS-2024-001)
    const year = new Date().getFullYear();
    const prefix = `${codePrefix}-${year}`;

    // Count only within the current tenant
    const count = await prisma.hRProfile.count({
      where: {
        tenantId,
        employeeId: { startsWith: prefix }
      }
    });

    const nextCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;

    return NextResponse.json({ nextCode });
  } catch (error) {
    console.error('Next employee code error:', error);
    return NextResponse.json(
      { error: 'Failed to generate employee code' },
      { status: 500 }
    );
  }
}
