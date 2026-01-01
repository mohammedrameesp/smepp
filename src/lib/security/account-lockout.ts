/**
 * @file account-lockout.ts
 * @description Account lockout protection against brute-force attacks with progressive lockout
 *              durations. Tracks failed login attempts and temporarily locks accounts.
 * @module security
 */

import { prisma } from '@/lib/core/prisma';

// Number of failed attempts before lockout
const MAX_FAILED_ATTEMPTS = parseInt(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || '5', 10);

// Lockout duration in minutes (progressive: 5min, 15min, 30min, 60min)
const LOCKOUT_DURATIONS_MINUTES = [5, 15, 30, 60];

/**
 * Check if an account is currently locked
 */
export async function isAccountLocked(userId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lockedUntil: true },
  });

  if (!user?.lockedUntil) {
    return { locked: false };
  }

  if (user.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: user.lockedUntil };
  }

  // Lock has expired, clear it
  await prisma.user.update({
    where: { id: userId },
    data: {
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });

  return { locked: false };
}

/**
 * Check if an account is locked by email (for login page)
 */
export async function isAccountLockedByEmail(email: string): Promise<{ locked: boolean; lockedUntil?: Date; minutesRemaining?: number }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, lockedUntil: true },
  });

  if (!user) {
    // Don't reveal if user exists
    return { locked: false };
  }

  if (!user.lockedUntil) {
    return { locked: false };
  }

  if (user.lockedUntil > new Date()) {
    const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
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

  return { locked: false };
}

/**
 * Record a failed login attempt
 * Returns whether the account is now locked
 */
export async function recordFailedLogin(userId: string): Promise<{ locked: boolean; lockedUntil?: Date; attemptsRemaining?: number }> {
  // Get current state
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });

  if (!user) {
    return { locked: false };
  }

  const newAttemptCount = user.failedLoginAttempts + 1;

  // Check if we should lock the account
  if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
    // Calculate lockout duration (progressive)
    const lockoutIndex = Math.min(
      Math.floor(newAttemptCount / MAX_FAILED_ATTEMPTS) - 1,
      LOCKOUT_DURATIONS_MINUTES.length - 1
    );
    const lockoutMinutes = LOCKOUT_DURATIONS_MINUTES[lockoutIndex];
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newAttemptCount,
        lockedUntil,
      },
    });

    return { locked: true, lockedUntil };
  }

  // Update attempt count
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttemptCount,
    },
  });

  return {
    locked: false,
    attemptsRemaining: MAX_FAILED_ATTEMPTS - newAttemptCount,
  };
}

/**
 * Record a failed login attempt by email (for cases where we only have email)
 */
export async function recordFailedLoginByEmail(email: string): Promise<{ locked: boolean; lockedUntil?: Date; attemptsRemaining?: number }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });

  if (!user) {
    // Don't reveal if user exists - still return a plausible response
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 };
  }

  return recordFailedLogin(user.id);
}

/**
 * Clear failed login attempts on successful login
 */
export async function clearFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Unlock an account (admin action)
 */
export async function unlockAccount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Get lockout status for an account (for admin UI)
 */
export async function getLockoutStatus(userId: string): Promise<{
  failedAttempts: number;
  isLocked: boolean;
  lockedUntil?: Date;
  maxAttempts: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const isLocked = user.lockedUntil ? user.lockedUntil > new Date() : false;

  return {
    failedAttempts: user.failedLoginAttempts,
    isLocked,
    lockedUntil: isLocked ? user.lockedUntil! : undefined,
    maxAttempts: MAX_FAILED_ATTEMPTS,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM MEMBER LOCKOUT FUNCTIONS (for new TeamMember model)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a TeamMember is currently locked
 */
export async function isTeamMemberLocked(memberId: string): Promise<{ locked: boolean; lockedUntil?: Date }> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { lockedUntil: true },
  });

  if (!member?.lockedUntil) {
    return { locked: false };
  }

  if (member.lockedUntil > new Date()) {
    return { locked: true, lockedUntil: member.lockedUntil };
  }

  // Lock has expired, clear it
  await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });

  return { locked: false };
}

/**
 * Record a failed login attempt for TeamMember
 */
export async function recordTeamMemberFailedLogin(memberId: string): Promise<{ locked: boolean; lockedUntil?: Date; attemptsRemaining?: number }> {
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });

  if (!member) {
    return { locked: false };
  }

  const newAttemptCount = member.failedLoginAttempts + 1;

  // Check if we should lock the account
  if (newAttemptCount >= MAX_FAILED_ATTEMPTS) {
    const lockoutIndex = Math.min(
      Math.floor(newAttemptCount / MAX_FAILED_ATTEMPTS) - 1,
      LOCKOUT_DURATIONS_MINUTES.length - 1
    );
    const lockoutMinutes = LOCKOUT_DURATIONS_MINUTES[lockoutIndex];
    const lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);

    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        failedLoginAttempts: newAttemptCount,
        lockedUntil,
      },
    });

    return { locked: true, lockedUntil };
  }

  // Update attempt count
  await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      failedLoginAttempts: newAttemptCount,
    },
  });

  return {
    locked: false,
    attemptsRemaining: MAX_FAILED_ATTEMPTS - newAttemptCount,
  };
}

/**
 * Clear failed login attempts on successful login for TeamMember
 */
export async function clearTeamMemberFailedLogins(memberId: string): Promise<void> {
  await prisma.teamMember.update({
    where: { id: memberId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}
