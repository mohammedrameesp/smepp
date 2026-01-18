/**
 * @file route.ts
 * @description Single error log API endpoint
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// GET /api/super-admin/error-logs/[id] - Get single error details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const error = await prisma.errorLog.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!error) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ error });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to fetch error log'
    );
    return NextResponse.json(
      { error: 'Failed to fetch error log' },
      { status: 500 }
    );
  }
}
