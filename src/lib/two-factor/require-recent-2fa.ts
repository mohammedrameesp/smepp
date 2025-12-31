/**
 * @file require-recent-2fa.ts
 * @description Enforces recent 2FA verification for sensitive operations.
 *              Provides defense-in-depth by requiring re-verification within a time window.
 * @module two-factor
 */

import { prisma } from '@/lib/core/prisma';
import { NextResponse } from 'next/server';

// Default window for 2FA re-verification (5 minutes)
const DEFAULT_2FA_WINDOW_MS = 5 * 60 * 1000;

export interface Recent2FACheckResult {
  verified: boolean;
  error?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
}

/**
 * Check if a super admin has verified 2FA recently enough for sensitive operations.
 *
 * This provides defense-in-depth by requiring recent 2FA verification for
 * high-risk actions like impersonation, admin management, and data restoration.
 *
 * @param userId - The super admin's user ID
 * @param maxAgeMs - Maximum age of 2FA verification in milliseconds (default: 5 minutes)
 * @returns Result indicating if 2FA was verified recently enough
 */
export async function checkRecent2FA(
  userId: string,
  maxAgeMs: number = DEFAULT_2FA_WINDOW_MS
): Promise<Recent2FACheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorVerifiedAt: true,
    },
  });

  if (!user) {
    return { verified: false, error: 'User not found' };
  }

  // If 2FA is not enabled, skip the check (user hasn't set up 2FA)
  // Note: In a strict environment, you might want to require 2FA setup first
  if (!user.twoFactorEnabled) {
    return { verified: true }; // Allow if 2FA not enabled
  }

  // If 2FA is enabled but never verified, require verification
  if (!user.twoFactorVerifiedAt) {
    return {
      verified: false,
      error: '2FA verification required for this action',
    };
  }

  const verifiedAt = user.twoFactorVerifiedAt;
  const now = new Date();
  const ageMs = now.getTime() - verifiedAt.getTime();
  const expiresAt = new Date(verifiedAt.getTime() + maxAgeMs);

  if (ageMs > maxAgeMs) {
    return {
      verified: false,
      error: '2FA verification expired. Please re-verify to continue.',
      verifiedAt,
      expiresAt,
    };
  }

  return {
    verified: true,
    verifiedAt,
    expiresAt,
  };
}

/**
 * Require recent 2FA verification for a sensitive operation.
 * Returns a NextResponse error if not verified, or null if OK.
 *
 * Usage in API routes:
 * ```
 * const require2FAResult = await requireRecent2FA(session.user.id);
 * if (require2FAResult) return require2FAResult;
 * // ... continue with sensitive operation
 * ```
 *
 * @param userId - The super admin's user ID
 * @param maxAgeMs - Maximum age of 2FA verification in milliseconds (default: 5 minutes)
 * @returns NextResponse error if not verified, null if OK
 */
export async function requireRecent2FA(
  userId: string,
  maxAgeMs: number = DEFAULT_2FA_WINDOW_MS
): Promise<NextResponse | null> {
  const result = await checkRecent2FA(userId, maxAgeMs);

  if (!result.verified) {
    return NextResponse.json(
      {
        error: 'Recent2FARequired',
        message: result.error || '2FA re-verification required for this action',
        requiresReAuth: true,
      },
      { status: 403 }
    );
  }

  return null;
}
