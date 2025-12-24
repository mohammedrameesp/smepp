import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { verifyTOTPCode } from '@/lib/two-factor/totp';
import { verifyBackupCode, removeBackupCode } from '@/lib/two-factor/backup-codes';
import { authRateLimitMiddleware } from '@/lib/security/rateLimit';

const verify2FASchema = z.object({
  pending2faToken: z.string().min(1, 'Token is required'),
  code: z.string().min(1, 'Code is required'),
  isBackupCode: z.boolean().optional().default(false),
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';

interface Pending2FAPayload {
  userId: string;
  email: string;
  purpose: string;
}

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (5 attempts per 15 minutes)
  const rateLimitResponse = authRateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const result = verify2FASchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { pending2faToken, code, isBackupCode } = result.data;

    // Verify the pending 2FA token
    let tokenPayload: Pending2FAPayload;
    try {
      tokenPayload = jwt.verify(pending2faToken, JWT_SECRET) as Pending2FAPayload;
    } catch {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    if (tokenPayload.purpose !== 'pending-2fa') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user || !user.isSuperAdmin || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    let isValid = false;

    if (isBackupCode) {
      // Verify backup code
      if (!user.twoFactorBackupCodes || user.twoFactorBackupCodes.length === 0) {
        return NextResponse.json(
          { error: 'No backup codes available' },
          { status: 400 }
        );
      }

      const matchedIndex = await verifyBackupCode(code, user.twoFactorBackupCodes);
      if (matchedIndex >= 0) {
        isValid = true;
        // Remove the used backup code
        const updatedCodes = removeBackupCode(user.twoFactorBackupCodes, matchedIndex);
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: updatedCodes },
        });
      }
    } else {
      // Verify TOTP code
      if (!user.twoFactorSecret) {
        return NextResponse.json(
          { error: '2FA not configured' },
          { status: 400 }
        );
      }

      isValid = verifyTOTPCode(user.twoFactorSecret, code);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: isBackupCode ? 'Invalid backup code' : 'Invalid verification code' },
        { status: 401 }
      );
    }

    // 2FA verified - Generate login token
    const loginToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        purpose: 'super-admin-login',
        twoFactorVerified: true,
      },
      JWT_SECRET,
      { expiresIn: '1m' }
    );

    return NextResponse.json({
      success: true,
      loginToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      remainingBackupCodes: isBackupCode ? user.twoFactorBackupCodes.length - 1 : undefined,
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
