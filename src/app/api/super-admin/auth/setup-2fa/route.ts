/**
 * @file route.ts
 * @description Setup and check 2FA status for super admin accounts
 * @module system/super-admin
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { generateTOTPSecret } from '@/lib/two-factor/totp';
import logger from '@/lib/core/log';

/**
 * Check if encryption is properly configured
 */
function checkEncryptionConfig(): { ok: boolean; error?: string } {
  const key = process.env.TWO_FACTOR_ENCRYPTION_KEY;

  if (!key && process.env.NODE_ENV === 'production') {
    return {
      ok: false,
      error: 'TWO_FACTOR_ENCRYPTION_KEY environment variable is not configured. Please contact your administrator.',
    };
  }

  if (!key && !process.env.NEXTAUTH_SECRET) {
    return {
      ok: false,
      error: 'Authentication is not properly configured. Please contact your administrator.',
    };
  }

  if (key && key.length !== 64) {
    return {
      ok: false,
      error: 'Encryption key is incorrectly configured. Please contact your administrator.',
    };
  }

  return { ok: true };
}
export async function POST() {
  try {
    // Check encryption configuration first
    const configCheck = checkEncryptionConfig();
    if (!configCheck.ok) {
      logger.error({ error: configCheck.error }, '2FA setup failed - encryption not configured');
      return NextResponse.json({ error: configCheck.error }, { status: 500 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if 2FA is already enabled
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to set up again.' },
        { status: 400 }
      );
    }

    // Generate TOTP secret and QR code
    const setupData = await generateTOTPSecret(user.email);

    // Store the encrypted secret temporarily (not enabled yet)
    // User must verify a code before we mark it as enabled
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: setupData.secret,
        // twoFactorEnabled remains false until verified
      },
    });

    return NextResponse.json({
      qrCodeDataUrl: setupData.qrCodeDataUrl,
      manualEntryKey: setupData.manualEntryKey,
      message: 'Scan the QR code with your authenticator app, then verify with a code to enable 2FA.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage, stack: error instanceof Error ? error.stack : undefined }, '2FA setup error');

    // Provide more specific error messages based on the error type
    if (errorMessage.includes('TWO_FACTOR_ENCRYPTION_KEY') || errorMessage.includes('NEXTAUTH_SECRET')) {
      return NextResponse.json(
        { error: 'Server encryption is not configured. Please contact your administrator.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to set up 2FA. Please try again later.' },
      { status: 500 }
    );
  }
}

// GET /api/super-admin/auth/setup-2fa - Check 2FA status
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

    return NextResponse.json({
      twoFactorEnabled: user.twoFactorEnabled,
      backupCodesCount: user.twoFactorBackupCodes?.length || 0,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, '2FA status check error');
    return NextResponse.json(
      { error: 'Failed to check 2FA status' },
      { status: 500 }
    );
  }
}
