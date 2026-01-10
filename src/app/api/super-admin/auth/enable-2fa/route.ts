/**
 * @file route.ts
 * @description Enable or disable 2FA for super admin accounts
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { verifyTOTPCode } from '@/lib/two-factor/totp';
import { generateBackupCodes } from '@/lib/two-factor/backup-codes';
import logger from '@/lib/core/log';

const enableSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

const disableSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

// POST /api/super-admin/auth/enable-2fa - Enable 2FA after verifying code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = enableSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code } = result.data;

    // Get user with pending 2FA secret
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled' },
        { status: 400 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: 'Please set up 2FA first by generating a QR code' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPCode(user.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 401 }
      );
    }

    // Generate backup codes
    const { plainCodes, hashedCodes } = await generateBackupCodes();

    // Enable 2FA and store backup codes
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: hashedCodes,
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been enabled successfully',
      backupCodes: plainCodes,
      warning: 'Save these backup codes in a safe place. They can only be viewed once.',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'Enable 2FA error');
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}

// DELETE /api/super-admin/auth/enable-2fa - Disable 2FA
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = disableSchema.safeParse(body);

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
        twoFactorSecret: true,
        twoFactorEnabled: true,
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

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA configuration is invalid' },
        { status: 400 }
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPCode(user.twoFactorSecret, code);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Disable 2FA and clear secrets
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    return NextResponse.json({
      success: true,
      message: '2FA has been disabled successfully',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'Disable 2FA error');
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
