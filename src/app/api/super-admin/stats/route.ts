/**
 * @file route.ts
 * @description Platform statistics for super admin dashboard and login page
 * @module system/super-admin
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
export async function GET() {
  try {
    // Get counts
    const [organizationCount, userCount] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count({
        where: {
          isSystemAccount: false,
        },
      }),
    ]);

    return NextResponse.json({
      organizations: organizationCount,
      users: userCount,
      uptime: '99.9%', // Static for now, could be dynamic with monitoring
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Stats fetch error');
    // Return default values on error
    return NextResponse.json({
      organizations: 0,
      users: 0,
      uptime: '99.9%',
    });
  }
}
