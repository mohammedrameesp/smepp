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
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Fetch all users with related data (tenant-scoped)
    const users = await prisma.user.findMany({
      where: {
        organizationMemberships: {
          some: { organizationId: session.user.organizationId },
        },
      },
      include: {
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data for CSV
    const csvData = users.map(user => ({
      id: user.id,
      name: user.name || '',
      email: user.email,
      role: user.role,
      isSystemAccount: user.isSystemAccount ? 'Yes' : 'No',
      emailVerified: user.emailVerified ? 'Yes' : 'No',
      assignedAssets: user._count.assets,
      assignedSubscriptions: user._count.subscriptions,
      image: user.image || '',
      createdAt: user.createdAt.toISOString().split('T')[0],
      updatedAt: user.updatedAt.toISOString().split('T')[0],
    }));

    // Define CSV headers
    const headers = [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      { key: 'role', header: 'Role' },
      { key: 'isSystemAccount', header: 'System Account' },
      { key: 'emailVerified', header: 'Email Verified' },
      { key: 'assignedAssets', header: 'Assigned Assets' },
      { key: 'assignedSubscriptions', header: 'Assigned Subscriptions' },
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
