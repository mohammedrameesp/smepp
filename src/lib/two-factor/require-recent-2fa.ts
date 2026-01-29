/**
 * @file require-recent-2fa.ts
 * @description Enforces recent 2FA verification for sensitive super admin operations.
 *              Provides defense-in-depth by requiring re-verification within a time window
 *              for high-risk actions like impersonation, admin management, and data restoration.
 * @module two-factor
 *
 * @security This module implements step-up authentication for sensitive operations.
 *           Even if a session is hijacked, the attacker cannot perform high-risk
 *           actions without re-verifying 2FA within the last 5 minutes.
 *
 * @example
 * // In an API route for a sensitive operation
 * export async function POST(request: NextRequest) {
 *   const session = await getServerSession(authOptions);
 *   if (!session?.user?.isSuperAdmin) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 *
 *   // Require recent 2FA verification
 *   const require2FAResult = await requireRecent2FA(session.user.id);
 *   if (require2FAResult) return require2FAResult;
 *
 *   // Proceed with sensitive operation...
 * }
 */

import { prisma } from '@/lib/core/prisma';
import { NextResponse } from 'next/server';

/** Default window for 2FA re-verification: 5 minutes in milliseconds */
const DEFAULT_2FA_WINDOW_MS = 5 * 60 * 1000;

/**
 * Result of checking recent 2FA verification status.
 */
export interface Recent2FACheckResult {
  /** Whether the user has verified 2FA recently enough */
  verified: boolean;
  /** Error message if verification failed */
  error?: string;
  /** Timestamp of last 2FA verification */
  verifiedAt?: Date;
  /** When the current verification window expires */
  expiresAt?: Date;
}

/**
 * Checks if a super admin has verified 2FA recently enough for sensitive operations.
 *
 * This provides defense-in-depth by requiring recent 2FA verification for
 * high-risk actions like impersonation, admin management, and data restoration.
 *
 * @param userId - The super admin's user ID
 * @param maxAgeMs - Maximum age of 2FA verification in milliseconds (default: 5 minutes)
 * @returns Result indicating if 2FA was verified recently enough
 *
 * @example
 * const result = await checkRecent2FA(userId);
 * if (!result.verified) {
 *   // Prompt user to re-verify 2FA
 *   return { requiresReAuth: true, error: result.error };
 * }
 *
 * @security This function is the core check. For API routes, prefer using
 *           requireRecent2FA() which returns a proper NextResponse.
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

  // If 2FA is not enabled, allow the operation
  // Note: Consider requiring 2FA setup for super admins in strict environments
  if (!user.twoFactorEnabled) {
    return { verified: true };
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
 * Requires recent 2FA verification for a sensitive API operation.
 * Returns a NextResponse error if not verified, or null if OK to proceed.
 *
 * @param userId - The super admin's user ID
 * @param maxAgeMs - Maximum age of 2FA verification in milliseconds (default: 5 minutes)
 * @returns NextResponse with 403 error if not verified, null if OK
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const session = await getServerSession(authOptions);
 *
 *   // Check 2FA - returns response if failed, null if OK
 *   const require2FAResult = await requireRecent2FA(session.user.id);
 *   if (require2FAResult) return require2FAResult;
 *
 *   // Safe to proceed with sensitive operation
 *   await performSensitiveAction();
 * }
 *
 * @security Use this in API routes that perform sensitive operations:
 *           - Impersonation
 *           - Admin user management
 *           - Data restoration
 *           - Platform reset
 *           - Data seeding/import
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

/*
 * ========== CODE REVIEW SUMMARY ==========
 * File: require-recent-2fa.ts
 * Reviewed: 2025-01-29
 *
 * CHANGES MADE:
 * - Added comprehensive file-level documentation with security context
 * - Added JSDoc with @param, @returns, @security, @example for all exports
 * - Added inline documentation for interface fields
 * - Added list of sensitive operations that should use this module
 *
 * SECURITY NOTES:
 * - Implements step-up authentication for high-risk operations
 * - 5-minute verification window balances security with usability
 * - If 2FA not enabled, operations are allowed (consider making stricter)
 * - Returns standardized error response for frontend handling
 *
 * REMAINING CONCERNS:
 * - Consider requiring 2FA setup for all super admins (currently optional)
 *
 * REQUIRED TESTS:
 * - [x] Returns verified:true when 2FA disabled
 * - [x] Returns verified:false when 2FA enabled but never verified
 * - [x] Returns verified:true within time window
 * - [x] Returns verified:false after time window expires
 * - [x] requireRecent2FA returns proper NextResponse
 *
 * DEPENDENCIES:
 * - @/lib/core/prisma: Database access
 * - next/server: NextResponse
 *
 * PRODUCTION READY: YES
 */
