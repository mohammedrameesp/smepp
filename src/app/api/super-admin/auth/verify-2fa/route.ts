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

// SECURITY: Fail fast if NEXTAUTH_SECRET is not set
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('CRITICAL: NEXTAUTH_SECRET environment variable is required');
}
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

interface Pending2FAPayload {
  userId: string;
  email: string;
  purpose: string;
  jti?: string; // Unique token ID for single-use verification
}

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (5 attempts per 15 minutes)
  const rateLimitResponse = await authRateLimitMiddleware(request);
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
        pending2FATokenJti: true,
      },
    });

    if (!user || !user.isSuperAdmin || !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // SECURITY: Validate JTI (JWT ID) to prevent token replay attacks
    // The JTI must match the stored value, indicating this is the current valid token
    if (!tokenPayload.jti || tokenPayload.jti !== user.pending2FATokenJti) {
      console.log(`[2FA] Token replay attempt detected for user ${user.email}`);
      return NextResponse.json(
        { error: 'Session expired or already used. Please log in again.' },
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
        // Remove the used backup code, clear the pending token JTI, and record verification time
        const updatedCodes = removeBackupCode(user.twoFactorBackupCodes, matchedIndex);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFactorBackupCodes: updatedCodes,
            pending2FATokenJti: null, // Invalidate token after use
            twoFactorVerifiedAt: new Date(), // For sensitive ops re-verification
          },
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

      // Clear the pending token JTI and record verification time after successful TOTP verification
      if (isValid) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pending2FATokenJti: null,
            twoFactorVerifiedAt: new Date(), // For sensitive ops re-verification
          },
        });
      }
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
