/**
 * @file route.ts
 * @description Re-authenticate 2FA for sensitive operations (impersonation, etc.)
 * @module system/super-admin
 *
 * This is different from verify-2fa which is used during the login flow.
 * This route is for re-verifying 2FA when the 5-minute window has expired
 * and the user needs to perform a sensitive operation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { verifyTOTPCode } from '@/lib/two-factor/totp';
import { verifyBackupCode, removeBackupCode } from '@/lib/two-factor/backup-codes';
import logger from '@/lib/core/log';

const reauthSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

// POST /api/super-admin/auth/reauth-2fa - Re-verify 2FA for sensitive operations
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = reauthSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code } = result.data;

    // Get user with 2FA details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { error: '2FA is not enabled on this account' },
        { status: 400 }
      );
    }

    if (!user.twoFactorSecret) {
      return NextResponse.json(
        { error: '2FA configuration is invalid' },
        { status: 400 }
      );
    }

    // Try TOTP code first (6 digits)
    let isValid = false;
    let usedBackupCode = false;

    if (code.length === 6 && /^\d+$/.test(code)) {
      // Standard TOTP code
      isValid = verifyTOTPCode(user.twoFactorSecret, code);
    } else {
      // Try as backup code
      if (user.twoFactorBackupCodes && user.twoFactorBackupCodes.length > 0) {
        const matchedIndex = await verifyBackupCode(code, user.twoFactorBackupCodes);
        if (matchedIndex >= 0) {
          isValid = true;
          usedBackupCode = true;
          // Remove the used backup code
          const updatedCodes = removeBackupCode(user.twoFactorBackupCodes, matchedIndex);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorBackupCodes: updatedCodes,
            },
          });
        }
      }
    }

    if (!isValid) {
      logger.warn({
        event: '2FA_REAUTH_FAILED',
        userId: user.id,
        userEmail: user.email,
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      }, '2FA re-authentication failed');

      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 401 }
      );
    }

    // Update verification timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorVerifiedAt: new Date(),
      },
    });

    logger.info({
      event: '2FA_REAUTH_SUCCESS',
      userId: user.id,
      userEmail: user.email,
      usedBackupCode,
      clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    }, '2FA re-authentication successful');

    return NextResponse.json({
      success: true,
      message: '2FA verified successfully',
      usedBackupCode,
      expiresIn: 5 * 60, // 5 minutes in seconds
      remainingBackupCodes: usedBackupCode ? (user.twoFactorBackupCodes?.length || 1) - 1 : undefined,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, '2FA re-auth error');
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
