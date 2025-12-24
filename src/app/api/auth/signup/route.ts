import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  inviteToken: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/signup - Create new user account
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, inviteToken } = result.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // If invite token provided, validate it first
    let invitation = null;
    if (inviteToken) {
      invitation = await prisma.organizationInvitation.findUnique({
        where: { token: inviteToken },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: 'Invalid invitation token' },
          { status: 400 }
        );
      }

      if (invitation.acceptedAt) {
        return NextResponse.json(
          { error: 'This invitation has already been used' },
          { status: 410 }
        );
      }

      if (invitation.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Invitation has expired' },
          { status: 410 }
        );
      }

      // Verify email matches invitation
      if (invitation.email.toLowerCase() !== normalizedEmail) {
        return NextResponse.json(
          { error: 'Email does not match the invitation' },
          { status: 403 }
        );
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if this is the super admin
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim();
    const isSuperAdmin = superAdminEmail === normalizedEmail;

    // Create user and optionally accept invitation in a transaction
    const userWithOrg = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          role: invitation ? (invitation.role === 'OWNER' ? 'ADMIN' : 'EMPLOYEE') : 'ADMIN',
          isSuperAdmin,
        },
      });

      // If invitation exists, accept it (create membership and mark as accepted)
      if (invitation) {
        const isOwner = invitation.role === 'OWNER';

        await tx.organizationUser.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
            isOwner,
          },
        });

        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });
      }

      return {
        user,
        organization: invitation?.organization || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: invitation
          ? `Account created and joined ${userWithOrg.organization?.name}`
          : 'Account created successfully',
        user: {
          id: userWithOrg.user.id,
          name: userWithOrg.user.name,
          email: userWithOrg.user.email,
        },
        organization: userWithOrg.organization
          ? {
              id: userWithOrg.organization.id,
              name: userWithOrg.organization.name,
              slug: userWithOrg.organization.slug,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
