/**
 * @file route.ts
 * @description Super admin login with email/password and optional 2FA
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authRateLimitMiddleware } from '@/lib/security/rateLimit';
import { isAccountLocked, recordFailedLogin, clearFailedLogins } from '@/lib/security/account-lockout';
import logger from '@/lib/core/log';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// SECURITY: Fail fast if NEXTAUTH_SECRET is not set
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('CRITICAL: NEXTAUTH_SECRET environment variable is required');
}
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const PENDING_2FA_TOKEN_EXPIRY = '5m'; // 5 minutes to enter 2FA code

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (5 attempts per 15 minutes)
  const rateLimitResponse = await authRateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isSuperAdmin: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    // Check if user exists
    if (!user) {
      // AUDIT: Log failed login attempt (user not found)
      logger.warn({
        event: 'SUPER_ADMIN_LOGIN_FAILED',
        reason: 'user_not_found',
        attemptedEmail: normalizedEmail,
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      }, 'Super admin login failed: user not found');

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if account is locked
    const lockStatus = await isAccountLocked(user.id);
    if (lockStatus.locked) {
      const minutesRemaining = lockStatus.lockedUntil
        ? Math.ceil((lockStatus.lockedUntil.getTime() - Date.now()) / 60000)
        : 5;
      return NextResponse.json(
        { error: `Account temporarily locked. Try again in ${minutesRemaining} minutes.` },
        { status: 429 }
      );
    }

    // Check if user is a super admin
    if (!user.isSuperAdmin) {
      // AUDIT: Log non-super admin access attempt
      logger.warn({
        event: 'SUPER_ADMIN_LOGIN_FAILED',
        reason: 'not_super_admin',
        userId: user.id,
        userEmail: user.email,
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      }, 'Super admin login failed: user is not a super admin');

      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      );
    }

    // Check if user has a password (not OAuth-only)
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'This account uses social login. Please use Microsoft or Google sign-in.' },
        { status: 400 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      // Record failed login attempt
      const lockResult = await recordFailedLogin(user.id);

      // AUDIT: Log failed login attempt (wrong password)
      logger.warn({
        event: 'SUPER_ADMIN_LOGIN_FAILED',
        reason: 'invalid_password',
        userId: user.id,
        userEmail: user.email,
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        attemptsRemaining: lockResult.attemptsRemaining,
        accountLocked: lockResult.locked,
      }, 'Super admin login failed: invalid password');

      if (lockResult.locked) {
        const minutesRemaining = lockResult.lockedUntil
          ? Math.ceil((lockResult.lockedUntil.getTime() - Date.now()) / 60000)
          : 5;
        return NextResponse.json(
          { error: `Too many failed attempts. Account locked for ${minutesRemaining} minutes.` },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Clear failed login attempts on successful password verification
    await clearFailedLogins(user.id);

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Generate a unique JTI (JWT ID) to prevent token replay attacks
      const jti = crypto.randomBytes(32).toString('hex');

      // Store the JTI in the database - invalidates any previous pending 2FA tokens
      await prisma.user.update({
        where: { id: user.id },
        data: { pending2FATokenJti: jti },
      });

      // Generate a pending 2FA token with unique session binding
      const pending2faToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          purpose: 'pending-2fa',
          jti, // Unique token ID for single-use verification
        },
        JWT_SECRET,
        { expiresIn: PENDING_2FA_TOKEN_EXPIRY }
      );

      // AUDIT: Log that password was correct, awaiting 2FA
      logger.info({
        event: 'SUPER_ADMIN_LOGIN_PENDING_2FA',
        userId: user.id,
        userEmail: user.email,
        clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      }, 'Super admin login: password verified, awaiting 2FA');

      return NextResponse.json({
        requires2FA: true,
        pending2faToken,
        message: 'Please enter your two-factor authentication code',
      });
    }

    // No 2FA - Generate a login token that can be used to complete sign-in
    const loginToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        purpose: 'super-admin-login',
      },
      JWT_SECRET,
      { expiresIn: '1m' }
    );

    // AUDIT: Log successful login (no 2FA)
    logger.info({
      event: 'SUPER_ADMIN_LOGIN_SUCCESS',
      userId: user.id,
      userEmail: user.email,
      twoFactorUsed: false,
      clientIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    }, 'Super admin login successful (no 2FA)');

    return NextResponse.json({
      requires2FA: false,
      loginToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined }, 'Super admin login error');
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
