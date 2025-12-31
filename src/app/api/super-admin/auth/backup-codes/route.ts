/**
 * @file route.ts
 * @description Get backup codes count and regenerate backup codes for 2FA
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { generateBackupCodes } from '@/lib/two-factor/backup-codes';
import { verifyTOTPCode } from '@/lib/two-factor/totp';

const regenerateSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

// GET /api/super-admin/auth/backup-codes - Get backup codes count
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      remainingCodes: user.twoFactorBackupCodes?.length || 0,
    });
  } catch (error) {
    console.error('Get backup codes error:', error);
    return NextResponse.json(
      { error: 'Failed to get backup codes count' },
      { status: 500 }
    );
  }
}

// POST /api/super-admin/auth/backup-codes - Regenerate backup codes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = regenerateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code } = result.data;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA is not enabled' },
        { status: 400 }
      );
    }

    // Verify TOTP code before regenerating
    const isValid = verifyTOTPCode(user.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Generate new backup codes
    const { plainCodes, hashedCodes } = await generateBackupCodes();

    // Update backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorBackupCodes: hashedCodes,
      },
    });

    return NextResponse.json({
      success: true,
      backupCodes: plainCodes,
      warning: 'Your previous backup codes have been invalidated. Save these new codes in a safe place.',
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}
