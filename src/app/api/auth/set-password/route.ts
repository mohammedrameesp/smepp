import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';

const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

    // Find user with this setup token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpiry: {
          gt: new Date(),
        },
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
    console.error('Validate setup token error:', error);
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
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { token, password } = result.data;

    // Find user with valid setup token
    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpiry: {
          gt: new Date(),
        },
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

    // Update user: set password, verify email, and clear setup token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: new Date(), // Mark email as verified since they clicked the link
        setupToken: null,
        setupTokenExpiry: null,
      },
    });

    console.log(`Initial password set for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Password created successfully. You can now sign in.',
    });
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
