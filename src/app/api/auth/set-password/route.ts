/**
 * @file route.ts
 * @description Initial password setup for invited users. Allows users to set
 * their password after receiving an invite email with a setup token.
 * @module api/auth/set-password
 *
 * Endpoints:
 * - GET: Validate setup token and get user info
 * - POST: Set initial password for user
 *
 * Security features:
 * - Token expiry validation
 * - Prevents double password setting
 * - Marks email as verified on success
 * - Password complexity validation (SEC-010)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { validatePassword, DEFAULT_PASSWORD_REQUIREMENTS } from '@/lib/security/password-validation';
import logger from '@/lib/core/log';
import { handleSystemError } from '@/lib/core/error-logger';

// SEC-010: Enhanced password validation with complexity requirements
const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .superRefine((password, ctx) => {
      const result = validatePassword(password, DEFAULT_PASSWORD_REQUIREMENTS);
      if (!result.valid) {
        result.errors.forEach((error) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: error,
          });
        });
      }
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/set-password?token=xxx - Validate setup token
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'missing_token' }, { status: 400 });
    }

    // Check User table (single source of truth for auth)
    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    if (!user) {
      // Check if token exists but expired
      const expiredUser = await prisma.user.findFirst({
        where: { setupToken: token },
        select: { setupTokenExpiry: true },
      });

      if (expiredUser) {
        return NextResponse.json({ valid: false, reason: 'expired' });
      }

      return NextResponse.json({ valid: false, reason: 'invalid' });
    }

    // Check if user already has a password set
    if (user.passwordHash) {
      return NextResponse.json({
        valid: false,
        reason: 'already_set',
        message: 'Password has already been set. Please use the login page.',
      });
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Validate setup token error');
    handleSystemError({
      type: 'API_ERROR',
      source: 'auth',
      action: 'validate-setup-token',
      method: 'GET',
      path: '/api/auth/set-password',
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
      severity: 'error',
    });
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/set-password - Set initial password with token
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = setPasswordSchema.safeParse(body);

    if (!result.success) {
      // Extract the first error message for user-friendly display
      const fieldErrors = result.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || 'Invalid input';
      return NextResponse.json(
        { error: firstError, fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Check User table (single source of truth for auth)
    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired setup token' },
        { status: 400 }
      );
    }

    // Check if user already has a password
    if (user.passwordHash) {
      return NextResponse.json(
        { error: 'Password has already been set. Please use the login page.' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hash(password, 12);

    // Update User: set password, verify email, and clear setup token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: new Date(), // Mark email as verified since they clicked the link
        setupToken: null,
        setupTokenExpiry: null,
      },
    });

    logger.debug({ userId: user.id }, 'Initial password set for user');

    return NextResponse.json({
      success: true,
      message: 'Password created successfully. You can now sign in.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Set password error');
    handleSystemError({
      type: 'API_ERROR',
      source: 'auth',
      action: 'set-password',
      method: 'POST',
      path: '/api/auth/set-password',
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
      severity: 'error',
    });
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 * Issues: None - proper validation and security measures in place
 */
