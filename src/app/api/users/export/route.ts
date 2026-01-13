/**
 * @file route.ts
 * @description Export users to Excel/CSV
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { arrayToCSV } from '@/lib/core/csv-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

async function exportUsersHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Fetch all team members (tenant-scoped via extension)
  const members = await db.teamMember.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform data for CSV
  const csvData: Record<string, unknown>[] = members.map(member => ({
    id: member.id,
    name: member.name || '',
    email: member.email,
    role: member.role,
    isEmployee: member.isEmployee ? 'Yes' : 'No',
    emailVerified: member.emailVerified ? 'Yes' : 'No',
    image: member.image || '',
    createdAt: member.createdAt.toISOString().split('T')[0],
    updatedAt: member.updatedAt.toISOString().split('T')[0],
  }));

  // Define CSV headers
  const headers: { key: string; header: string }[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'isEmployee', header: 'Is Employee' },
    { key: 'emailVerified', header: 'Email Verified' },
    { key: 'image', header: 'Profile Image URL' },
    { key: 'createdAt', header: 'Created At' },
    { key: 'updatedAt', header: 'Updated At' },
  ];

  // Generate CSV
  const csvBuffer = await arrayToCSV(csvData, headers);

  // Return CSV file
  const filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;

  return new NextResponse(new Uint8Array(csvBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export const GET = withErrorHandler(exportUsersHandler, { requireAdmin: true });
