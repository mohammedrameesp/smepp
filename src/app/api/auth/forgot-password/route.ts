import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password - Request password reset
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find user with password (credential users only)
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        passwordHash: { not: null }, // Only credential users can reset password
      },
    });

    // Always return success to prevent email enumeration
    // But only send reset link if user exists
    if (user) {
      // Generate secure token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Build reset URL
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password/${resetToken}`;

      // TODO: Send email with reset link
      // For now, log to console (in production, use email service)
      console.log('===========================================');
      console.log(`PASSWORD RESET for ${user.email}:`);
      console.log(resetUrl);
      console.log('Token expires:', resetTokenExpiry.toISOString());
      console.log('===========================================');
    }

    // Always return success (security: don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
