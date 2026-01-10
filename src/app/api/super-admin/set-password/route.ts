/**
 * @file route.ts
 * @description Set user password (super admin utility endpoint)
 * @module system/super-admin
 *
 * SECURITY: Requires super admin authentication
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/core/log';

export async function POST(request: Request) {
  try {
    // SECURITY: Require super admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update the user and invalidate existing sessions
    const user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        passwordChangedAt: new Date(), // SECURITY: Invalidates all existing sessions
      },
      select: { id: true, email: true, name: true },
    });

    // AUDIT: Log super admin password reset action
    logger.info({
      event: 'SUPER_ADMIN_PASSWORD_RESET',
      superAdminId: session.user.id,
      superAdminEmail: session.user.email,
      targetUserId: user.id,
      targetUserEmail: user.email,
    }, `Super admin ${session.user.email} reset password for ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Password updated for ${user.name} (${user.email})`,
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Set password failed');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
