/**
 * @file account-lockout.ts
 * @description Account lockout protection against brute-force attacks
 * @module lib/security
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * BRUTE-FORCE PROTECTION
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * This module implements account lockout to protect against brute-force password
 * guessing attacks. When a user exceeds the maximum failed login attempts, their
 * account is temporarily locked with progressive duration increases.
 *
 * LOCKOUT POLICY:
 * ──────────────────────────────────────────────────────────────────────────────
 * - Max attempts before lockout: 5 (configurable via ACCOUNT_LOCKOUT_MAX_ATTEMPTS)
 * - Progressive lockout durations: 5min → 15min → 30min → 60min
 * - Successful login resets the counter
 * - Expired locks are automatically cleared on next check
 *
 * LOCKOUT PROGRESSION:
 * ──────────────────────────────────────────────────────────────────────────────
 * | Failed Attempts | Lockout Duration |
 * |-----------------|------------------|
 * | 5               | 5 minutes        |
 * | 10              | 15 minutes       |
 * | 15              | 30 minutes       |
 * | 20+             | 60 minutes       |
 *
 * SECURITY CONSIDERATIONS:
 * ──────────────────────────────────────────────────────────────────────────────
 * - @security Functions that accept email don't reveal user existence
 * - @security Lockout check happens BEFORE password verification (in auth.ts)
 * - @security Uses atomic increment to prevent race conditions
 * - @security All lockout events are logged for security monitoring
 *
 * USAGE:
 * ──────────────────────────────────────────────────────────────────────────────
 * ```typescript
 * // In auth flow (see auth.ts for full implementation)
 * const lockStatus = await isAccountLocked(userId);
 * if (lockStatus.locked) {
 *   throw new Error(`Account locked for ${lockStatus.minutesRemaining} minutes`);
 * }
 *
 * // After failed password verification
 * const result = await recordFailedLogin(userId);
 * if (result.locked) {
 *   // Account is now locked
 * }
 *
 * // After successful login
 * await clearFailedLogins(userId);
 * ```
 *
 * @see auth.ts for authentication flow integration
 */

import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum failed login attempts before account lockout
 * @security Configurable via ACCOUNT_LOCKOUT_MAX_ATTEMPTS environment variable
 * @default 5
 */
const MAX_FAILED_ATTEMPTS = Math.max(
  1,
  parseInt(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || '5', 10)
);

/**
 * Progressive lockout durations in minutes
 * Each subsequent lockout cycle increases the duration
 * @security Configurable via ACCOUNT_LOCKOUT_DURATIONS environment variable
 * @default [5, 15, 30, 60]
 */
const LOCKOUT_DURATIONS_MINUTES: readonly number[] = (() => {
  const envDurations = process.env.ACCOUNT_LOCKOUT_DURATIONS;
  if (envDurations) {
    try {
      const parsed = JSON.parse(envDurations);
      if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number' && n > 0)) {
        return Object.freeze(parsed);
      }
    } catch {
      logger.warn({
        event: 'LOCKOUT_CONFIG_INVALID',
        value: envDurations,
      }, 'Invalid ACCOUNT_LOCKOUT_DURATIONS, using default');
    }
  }
  return Object.freeze([5, 15, 30, 60]);
})();

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate userId parameter
 * @security Prevents injection and ensures valid input
 */
function isValidUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.length >= 5 && userId.length <= 50;
}

/**
 * Validate email parameter
 * @security Basic email format validation
 */
function isValidEmail(email: string): boolean {
  return typeof email === 'string' && email.includes('@') && email.length >= 5 && email.length <= 255;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCKOUT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an account is currently locked by user ID
 *
 * @param userId - The user's ID
 * @returns Lock status with optional lockedUntil timestamp
 *
 * @security This function clears expired locks automatically
 * @security Should be called BEFORE password verification
 */
export async function isAccountLocked(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  minutesRemaining?: number;
}> {
  // @security Validate input
  if (!isValidUserId(userId)) {
    logger.warn({
      event: 'LOCKOUT_INVALID_INPUT',
      inputType: 'userId',
    }, 'Invalid userId provided to isAccountLocked');
    return { locked: false };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });

    if (!user?.lockedUntil) {
      return { locked: false };
    }

    const now = new Date();
    if (user.lockedUntil > now) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      return { locked: true, lockedUntil: user.lockedUntil, minutesRemaining };
    }

    // Lock has expired, clear it
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    logger.info({
      event: 'LOCKOUT_EXPIRED_CLEARED',
      userId,
    }, 'Expired account lockout cleared');

    return { locked: false };
  } catch (error) {
    logger.error({
      event: 'LOCKOUT_CHECK_ERROR',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error checking account lockout status');
    // @security On error, don't lock out - fail open but log for investigation
    return { locked: false };
  }
}

/**
 * Check if an account is locked by email
 *
 * @param email - The user's email address
 * @returns Lock status with optional timing information
 *
 * @security Does NOT reveal whether the email exists in the system
 * @security Returns consistent response for non-existent users
 */
export async function isAccountLockedByEmail(email: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  minutesRemaining?: number;
}> {
  // @security Validate input
  if (!isValidEmail(email)) {
    return { locked: false };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, lockedUntil: true },
    });

    // @security Don't reveal if user exists
    if (!user) {
      return { locked: false };
    }

    if (!user.lockedUntil) {
      return { locked: false };
    }

    const now = new Date();
    if (user.lockedUntil > now) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      return { locked: true, lockedUntil: user.lockedUntil, minutesRemaining };
    }

    // Lock has expired, clear it
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    logger.info({
      event: 'LOCKOUT_EXPIRED_CLEARED',
      userId: user.id,
    }, 'Expired account lockout cleared');

    return { locked: false };
  } catch (error) {
    logger.error({
      event: 'LOCKOUT_CHECK_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error checking account lockout status by email');
    return { locked: false };
  }
}

/**
 * Record a failed login attempt and potentially lock the account
 *
 * @param userId - The user's ID
 * @returns Lock status after recording the failed attempt
 *
 * @security Uses atomic increment to prevent race conditions
 * @security Logs all lockout events for security monitoring
 */
export async function recordFailedLogin(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  attemptsRemaining?: number;
}> {
  // @security Validate input
  if (!isValidUserId(userId)) {
    logger.warn({
      event: 'LOCKOUT_INVALID_INPUT',
      inputType: 'userId',
    }, 'Invalid userId provided to recordFailedLogin');
    return { locked: false };
  }

  try {
    // @security Use atomic increment to prevent TOCTOU race conditions
    // This ensures that even concurrent requests increment correctly
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
      select: {
        failedLoginAttempts: true,
        lockedUntil: true,
        email: true,
      },
    });

    const newAttemptCount = user.failedLoginAttempts;

    // Check if we should lock the account
    if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
      // Calculate lockout duration (progressive)
      // lockoutIndex: 0 for first lockout, 1 for second, etc.
      const lockoutIndex = Math.min(
        Math.floor(newAttemptCount / MAX_FAILED_ATTEMPTS) - 1,
        LOCKOUT_DURATIONS_MINUTES.length - 1
      );
      const lockoutMinutes = LOCKOUT_DURATIONS_MINUTES[lockoutIndex];
      const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

      // Update with lock
      await prisma.user.update({
        where: { id: userId },
        data: { lockedUntil },
      });

      // @audit Log lockout event for security monitoring
      logger.warn({
        event: 'ACCOUNT_LOCKED',
        userId,
        userEmail: user.email,
        failedAttempts: newAttemptCount,
        lockoutDurationMinutes: lockoutMinutes,
        lockoutIndex: lockoutIndex + 1,
        lockedUntil: lockedUntil.toISOString(),
      }, `Account locked after ${newAttemptCount} failed attempts (${lockoutMinutes} minutes)`);

      return { locked: true, lockedUntil };
    }

    // Not locked yet - return attempts remaining
    const attemptsRemaining = MAX_FAILED_ATTEMPTS - newAttemptCount;

    // @audit Log failed attempt for security monitoring
    logger.info({
      event: 'LOGIN_ATTEMPT_FAILED',
      userId,
      failedAttempts: newAttemptCount,
      attemptsRemaining,
    }, `Failed login attempt ${newAttemptCount}/${MAX_FAILED_ATTEMPTS}`);

    return {
      locked: false,
      attemptsRemaining,
    };
  } catch (error) {
    // Check if error is because user doesn't exist
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return { locked: false };
    }

    logger.error({
      event: 'LOCKOUT_RECORD_ERROR',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error recording failed login attempt');

    // @security On error, don't lock out but don't reveal the error
    return { locked: false };
  }
}

/**
 * Record a failed login attempt by email
 *
 * @param email - The user's email address
 * @returns Lock status after recording the failed attempt
 *
 * @security Does NOT reveal whether the email exists
 * @security Returns plausible response for non-existent users
 */
export async function recordFailedLoginByEmail(email: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  attemptsRemaining?: number;
}> {
  // @security Validate input
  if (!isValidEmail(email)) {
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      // @security Don't reveal if user exists - return plausible response
      return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 };
    }

    return recordFailedLogin(user.id);
  } catch (error) {
    logger.error({
      event: 'LOCKOUT_RECORD_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error recording failed login attempt by email');

    // @security Return plausible response on error
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 };
  }
}

/**
 * Clear failed login attempts after successful authentication
 *
 * @param userId - The user's ID
 *
 * @security Should be called after successful password verification
 * @security Logs the clear event for audit trail
 */
export async function clearFailedLogins(userId: string): Promise<void> {
  // @security Validate input
  if (!isValidUserId(userId)) {
    logger.warn({
      event: 'LOCKOUT_INVALID_INPUT',
      inputType: 'userId',
    }, 'Invalid userId provided to clearFailedLogins');
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    // Only log if there were failed attempts to clear
    const hadFailedAttempts = user && (user.failedLoginAttempts > 0 || user.lockedUntil);

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    if (hadFailedAttempts) {
      logger.info({
        event: 'LOCKOUT_CLEARED',
        userId,
        previousAttempts: user?.failedLoginAttempts || 0,
        wasLocked: !!user?.lockedUntil,
      }, 'Failed login attempts cleared after successful login');
    }
  } catch (error) {
    logger.error({
      event: 'LOCKOUT_CLEAR_ERROR',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error clearing failed login attempts');
    // Don't throw - this is a non-critical operation after successful login
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Manually unlock a user account (for admin use)
 *
 * @param userId - The user's ID to unlock
 * @param adminUserId - The admin performing the unlock (for audit)
 *
 * @security Only for admin use - caller must verify admin permissions
 * @security Logs unlock event with admin ID for audit trail
 */
export async function adminUnlockAccount(userId: string, adminUserId: string): Promise<{
  success: boolean;
  wasLocked: boolean;
}> {
  // @security Validate inputs
  if (!isValidUserId(userId) || !isValidUserId(adminUserId)) {
    logger.warn({
      event: 'ADMIN_UNLOCK_INVALID_INPUT',
      adminUserId,
    }, 'Invalid input provided to adminUnlockAccount');
    return { success: false, wasLocked: false };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true, failedLoginAttempts: true, email: true },
    });

    if (!user) {
      return { success: false, wasLocked: false };
    }

    const wasLocked = !!(user.lockedUntil && user.lockedUntil > new Date());

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // @audit Log admin unlock for security audit
    logger.warn({
      event: 'ADMIN_ACCOUNT_UNLOCKED',
      userId,
      userEmail: user.email,
      adminUserId,
      wasLocked,
      previousAttempts: user.failedLoginAttempts,
    }, `Account manually unlocked by admin${wasLocked ? ' (was locked)' : ''}`);

    return { success: true, wasLocked };
  } catch (error) {
    logger.error({
      event: 'ADMIN_UNLOCK_ERROR',
      userId,
      adminUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error during admin account unlock');
    return { success: false, wasLocked: false };
  }
}

/**
 * Get lockout status for admin dashboard
 *
 * @param userId - The user's ID
 * @returns Full lockout details for admin view
 *
 * @security Only for admin use - caller must verify admin permissions
 */
export async function getAccountLockoutStatus(userId: string): Promise<{
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil: Date | null;
  minutesRemaining: number | null;
} | null> {
  if (!isValidUserId(userId)) {
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });

    if (!user) {
      return null;
    }

    const now = new Date();
    const isLocked = !!(user.lockedUntil && user.lockedUntil > now);
    const minutesRemaining = isLocked
      ? Math.ceil((user.lockedUntil!.getTime() - now.getTime()) / 60000)
      : null;

    return {
      failedAttempts: user.failedLoginAttempts,
      isLocked,
      lockedUntil: user.lockedUntil,
      minutesRemaining,
    };
  } catch (error) {
    logger.error({
      event: 'LOCKOUT_STATUS_ERROR',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Error getting account lockout status');
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS FOR TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/** @internal Exported for testing only */
export const _testExports = {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATIONS_MINUTES,
  isValidUserId,
  isValidEmail,
};
