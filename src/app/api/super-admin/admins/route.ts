/**
 * @file route.ts
 * @description List super admins and invite/promote new super admins
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { requireRecent2FA } from '@/lib/two-factor';
import logger from '@/lib/core/log';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdmins = await prisma.user.findMany({
      where: { isSuperAdmin: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        twoFactorEnabled: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    return NextResponse.json({ superAdmins });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Get super admins error');
    return NextResponse.json(
      { error: 'Failed to get super admins' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/admins - Invite a new super admin
// ═══════════════════════════════════════════════════════════════════════════════

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Require recent 2FA verification for super admin management
    // Creating/promoting super admins is a high-privilege operation
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

    const body = await request.json();
    const { email, name } = inviteSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.isSuperAdmin) {
        return NextResponse.json(
          { error: 'This user is already a super admin' },
          { status: 400 }
        );
      }

      // Promote existing user to super admin
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { isSuperAdmin: true },
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
        },
      });

      return NextResponse.json({
        message: 'User promoted to super admin',
        user: updatedUser,
        isNewUser: false,
      });
    }

    // Create new super admin user with temporary password
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        isSuperAdmin: true,
        emailVerified: new Date(), // Mark as verified since we're creating directly
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
      },
    });

    // Note: In development, temp password is returned in response for convenience.
    // In production, the creating admin should manually share credentials securely.
    // Future enhancement: Send welcome email with password setup link.

    return NextResponse.json({
      message: 'Super admin created successfully',
      user: newUser,
      isNewUser: true,
      tempPassword: process.env.NODE_ENV === 'development' ? tempPassword : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Create super admin error');
    return NextResponse.json(
      { error: 'Failed to create super admin' },
      { status: 500 }
    );
  }
}
