/**
 * @file route.ts
 * @description Export users to Excel/CSV
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV } from '@/lib/core/import-export';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { deriveOrgRole } from '@/lib/access-control';

async function exportUsersHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // Fetch all team members (without user relation for production compatibility)
  const members = await db.teamMember.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Query User emailVerified separately by email (production schema compatibility)
  const emails = members.map((m) => m.email.toLowerCase());
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, emailVerified: true },
  });
  const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));

  // Transform data for CSV
  const csvData: Record<string, unknown>[] = members.map(member => {
    const user = userMap.get(member.email.toLowerCase());
    return {
      id: member.id,
      name: member.name || '',
      email: member.email,
      role: deriveOrgRole(member),
      isEmployee: member.isEmployee ? 'Yes' : 'No',
      emailVerified: user?.emailVerified ? 'Yes' : 'No',
      image: member.image || '',
      createdAt: member.createdAt.toISOString().split('T')[0],
      updatedAt: member.updatedAt.toISOString().split('T')[0],
    };
  });

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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None needed - file has JSDoc, proper tenant isolation, admin authorization
 * Issues: None - exports are properly secured and tenant-scoped
 */
