import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authRateLimitMiddleware } from '@/lib/security/rateLimit';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';
const PENDING_2FA_TOKEN_EXPIRY = '5m'; // 5 minutes to enter 2FA code

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (5 attempts per 15 minutes)
  const rateLimitResponse = authRateLimitMiddleware(request);
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
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is a super admin
    if (!user.isSuperAdmin) {
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
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      // Generate a pending 2FA token
      const pending2faToken = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          purpose: 'pending-2fa',
        },
        JWT_SECRET,
        { expiresIn: PENDING_2FA_TOKEN_EXPIRY }
      );

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
    console.error('Super admin login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
