import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { z } from 'zod';
import { validatePassword, DEFAULT_PASSWORD_REQUIREMENTS } from '@/lib/security/password-validation';
import logger from '@/lib/core/log';
import { handleSystemError } from '@/lib/core/error-logger';

/**
 * Hash reset token for comparison
 * SECURITY: Tokens are stored hashed in DB
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// SEC-010: Enhanced password validation with complexity requirements
const resetPasswordSchema = z.object({
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
// GET /api/auth/reset-password?token=xxx - Validate reset token
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    // SECURITY: Hash the token before comparing with stored hash
    const hashedToken = hashToken(token);

    // Check User table (single source of truth for auth)
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
    });

    return NextResponse.json({ valid: !!user });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Validate reset token error');
    handleSystemError({
      type: 'API_ERROR',
      source: 'auth',
      action: 'validate-reset-token',
      method: 'GET',
      path: '/api/auth/reset-password',
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
      severity: 'error',
    });
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password - Reset password with token
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = resetPasswordSchema.safeParse(body);

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

    // SECURITY: Hash the token before comparing with stored hash
    const hashedToken = hashToken(token);

    // Check User table (single source of truth for auth)
    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hash(password, 12);

    // Update User: set new password, clear reset token, clear lockout, and invalidate existing sessions
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        passwordChangedAt: new Date(), // SECURITY: Invalidates all existing sessions
        failedLoginAttempts: 0, // Clear lockout - user proved ownership via email
        lockedUntil: null,
      },
    });

    logger.debug({ userId: user.id }, 'Password reset successful');

    return NextResponse.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Reset password error');
    handleSystemError({
      type: 'API_ERROR',
      source: 'auth',
      action: 'reset-password',
      method: 'POST',
      path: '/api/auth/reset-password',
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      statusCode: 500,
      severity: 'error',
    });
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
