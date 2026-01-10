import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { validatePassword, DEFAULT_PASSWORD_REQUIREMENTS } from '@/lib/security/password-validation';
import logger from '@/lib/core/log';

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

    // Check TeamMember first (org users)
    const teamMember = await prisma.teamMember.findFirst({
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

    // Fall back to User model (for super admins)
    const user = !teamMember ? await prisma.user.findFirst({
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
    }) : null;

    const targetUser = teamMember || user;

    if (!targetUser) {
      // Check if token exists but expired (check both models)
      const expiredTeamMember = await prisma.teamMember.findFirst({
        where: { setupToken: token },
        select: { setupTokenExpiry: true },
      });
      const expiredUser = !expiredTeamMember ? await prisma.user.findFirst({
        where: { setupToken: token },
        select: { setupTokenExpiry: true },
      }) : null;

      if (expiredTeamMember || expiredUser) {
        return NextResponse.json({ valid: false, reason: 'expired' });
      }

      return NextResponse.json({ valid: false, reason: 'invalid' });
    }

    // Check if user already has a password set
    if (targetUser.passwordHash) {
      return NextResponse.json({
        valid: false,
        reason: 'already_set',
        message: 'Password has already been set. Please use the login page.',
      });
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: targetUser.email,
        name: targetUser.name,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Validate setup token error');
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

    // Check TeamMember first (org users)
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        setupToken: token,
        setupTokenExpiry: {
          gt: new Date(),
        },
        isDeleted: false,
      },
    });

    // Fall back to User model (for super admins)
    const user = !teamMember ? await prisma.user.findFirst({
      where: {
        setupToken: token,
        setupTokenExpiry: {
          gt: new Date(),
        },
      },
    }) : null;

    if (!teamMember && !user) {
      return NextResponse.json(
        { error: 'Invalid or expired setup token' },
        { status: 400 }
      );
    }

    const targetUser = teamMember || user;

    // Check if user already has a password
    if (targetUser!.passwordHash) {
      return NextResponse.json(
        { error: 'Password has already been set. Please use the login page.' },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hash(password, 12);

    if (teamMember) {
      // Update TeamMember: set password, verify email, and clear setup token
      await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          passwordHash,
          emailVerified: new Date(), // Mark email as verified since they clicked the link
          setupToken: null,
          setupTokenExpiry: null,
        },
      });
      logger.debug({ memberId: teamMember.id }, 'Initial password set for team member');
    } else if (user) {
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
    }

    return NextResponse.json({
      success: true,
      message: 'Password created successfully. You can now sign in.',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Set password error');
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
