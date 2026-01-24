import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validatePassword, DEFAULT_PASSWORD_REQUIREMENTS } from '@/lib/security/password-validation';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

// SEC-010: Enhanced password validation with complexity requirements
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  email: z.string().email('Invalid email address'),
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

    // Check if email already exists in User table
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

    // Pre-fetch data needed in transaction (to minimize transaction time)
    let employeeCodePrefix: string | null = null;
    let employeeCount = 0;
    if (invitation && (invitation.isEmployee ?? true)) {
      const year = new Date().getFullYear();
      const orgPrefix = await getOrganizationCodePrefix(invitation.organizationId);
      employeeCodePrefix = `${orgPrefix}-${year}`;
      employeeCount = await prisma.teamMember.count({
        where: {
          tenantId: invitation.organizationId,
          employeeCode: { startsWith: employeeCodePrefix },
        },
      });
    }

    // Create User and optionally accept invitation in a transaction
    const userWithOrg = await prisma.$transaction(async (tx) => {
      // Create User (single source of truth for auth)
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          emailVerified: new Date(), // Verified via signup
          isSuperAdmin,
        },
      });

      // If invitation exists, accept it (create or update TeamMember and mark as accepted)
      if (invitation) {
        const isOwner = invitation.role === 'OWNER';

        // Use employee status from invitation (set by admin during invite)
        const finalIsEmployee = invitation.isEmployee ?? true;
        const finalIsOnWps = finalIsEmployee ? (invitation.isOnWps ?? false) : false;

        // Determine if user should be admin based on their org role
        const isAdmin = invitation.role === 'OWNER' || invitation.role === 'ADMIN';

        // Check if TeamMember already exists (created by admin via /api/users)
        const existingMember = await tx.teamMember.findFirst({
          where: {
            tenantId: invitation.organizationId,
            email: normalizedEmail,
          },
        });

        if (existingMember) {
          // Update existing TeamMember with userId FK
          await tx.teamMember.update({
            where: { id: existingMember.id },
            data: {
              userId: user.id,
              name: name,
            },
          });
        } else {
          // Generate employee code for employees using pre-fetched data
          let employeeCode: string | null = null;
          if (finalIsEmployee && employeeCodePrefix) {
            employeeCode = `${employeeCodePrefix}-${String(employeeCount + 1).padStart(3, '0')}`;
          }

          // Create new TeamMember with userId FK
          await tx.teamMember.create({
            data: {
              tenantId: invitation.organizationId,
              userId: user.id,
              email: normalizedEmail, // Denormalized for queries
              name: name,
              isAdmin,
              isOwner,
              isEmployee: finalIsEmployee,
              isOnWps: finalIsOnWps,
              employeeCode,
              canLogin: true,
              image: !finalIsEmployee && invitation.organization.logoUrl
                ? invitation.organization.logoUrl
                : null,
            },
          });
        }

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

    // Determine if user is owner (for redirect to setup wizard)
    const isOwner = invitation?.role === 'OWNER';

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
        isOwner,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Signup error');
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
