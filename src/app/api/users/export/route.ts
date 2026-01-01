/**
 * @file route.ts
 * @description Export users to Excel/CSV
 * @module system/users
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV } from '@/lib/csv-utils';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Fetch all team members (tenant-scoped)
    const members = await prisma.teamMember.findMany({
      where: {
        tenantId: session.user.organizationId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for CSV
    const csvData = members.map(member => ({
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
    const headers = [
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
    const csvBuffer = await arrayToCSV(csvData, headers as any);

    // Return CSV file
    const filename = `users_export_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Users export error:', error);
    return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
  }
}
