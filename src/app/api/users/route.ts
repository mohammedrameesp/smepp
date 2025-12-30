import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createUserSchema } from '@/lib/validations/users';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler } from '@/lib/http/handler';
import { sendEmail } from '@/lib/email';
import { welcomeUserEmail, welcomeUserWithPasswordSetupEmail } from '@/lib/core/email-templates';
import { randomBytes } from 'crypto';

async function getUsersHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  // Require organization context for tenant isolation
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const includeHrProfile = searchParams.get('includeHrProfile') === 'true';
  const includeAll = searchParams.get('includeAll') === 'true';
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  // Build where clause with tenant filtering
  const where: any = {
    organizationMemberships: {
      some: { organizationId: session.user.organizationId },
    },
  };
  if (role) where.role = role;

  // By default, exclude soft-deleted users unless explicitly requested
  if (!includeDeleted) {
    where.isDeleted = false;
  }

  // Build include clause
  const include: any = {
    _count: {
      select: {
        assets: true,
        subscriptions: true,
      },
    },
  };

  // Include HR profile if requested (for date of joining, etc.)
  if (includeHrProfile || includeAll) {
    include.hrProfile = {
      select: {
        id: true,
        tenantId: true,
        dateOfJoining: true,
        employeeId: true,
        designation: true,
      },
    };
  }

  // Include salary structure if includeAll (for payroll module)
  if (includeAll) {
    include.salaryStructure = {
      select: {
        id: true,
      },
    };
  }

  // Fetch users (soft-delete fields isDeleted, deletedAt, scheduledDeletionAt are included by default)
  const users = await prisma.user.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });

  // Filter hrProfile by tenantId - only include hrProfile if it belongs to current organization
  // This is needed because hrProfile is a one-to-one relation and can't be filtered in Prisma include
  if (includeHrProfile || includeAll) {
    const filteredUsers = users.map((user: any) => {
      if (user.hrProfile && user.hrProfile.tenantId !== session.user.organizationId) {
        // hrProfile belongs to different organization, exclude it
        return { ...user, hrProfile: null };
      }
      return user;
    });
    return NextResponse.json({ users: filteredUsers });
  }
  return NextResponse.json(users);
}

export const GET = withErrorHandler(getUsersHandler, { requireAdmin: true, rateLimit: true });

async function createUserHandler(request: NextRequest) {
  // Parse and validate request body
  const body = await request.json();
  const validation = createUserSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues
    }, { status: 400 });
  }

  const { name, email, role, employeeId, designation, isEmployee, canLogin, isOnWps } = validation.data;

  // Get session for tenant context
  const session = await getServerSession(authOptions);
  if (!session?.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  // Generate email for non-login users (use placeholder to satisfy unique constraint)
  // Format: nologin-{uuid}@{tenantSlug}.internal
  let finalEmail = email;
  if (!canLogin && !email) {
    const crypto = await import('crypto');
    const uniqueId = crypto.randomUUID().split('-')[0]; // Use first segment of UUID for shorter ID
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { slug: true },
    });
    finalEmail = `nologin-${uniqueId}@${org?.slug || 'system'}.internal`;
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: finalEmail },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: 'User with this email already exists' },
      { status: 409 }
    );
  }

  // Generate employee code if not provided (only for employees)
  let finalEmployeeId = employeeId;
  if (isEmployee && !finalEmployeeId) {
    // Generate employee code: BCE-YYYY-XXX (e.g., BCE-2024-001)
    const year = new Date().getFullYear();
    const prefix = `BCE-${year}`;
    const count = await prisma.hRProfile.count({
      where: {
        employeeId: { startsWith: prefix }
      }
    });
    finalEmployeeId = `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  // Build user data
  const userData: any = {
    name,
    email: finalEmail,
    role,
    isEmployee,
    canLogin,
    isOnWps: isEmployee ? isOnWps : false, // Only set WPS for employees
    emailVerified: null,
    // Create organization membership so user appears in tenant-filtered queries
    organizationMemberships: {
      create: {
        organizationId: session.user.organizationId,
        role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
      }
    }
  };

  // Only create HR profile for employees
  if (isEmployee) {
    userData.hrProfile = {
      create: {
        employeeId: finalEmployeeId,
        designation: designation || null,
        onboardingComplete: false,
        onboardingStep: 0,
        tenantId: session.user.organizationId,
      }
    };
  }

  // Create user with optional HR profile and organization membership
  // Note: Password is not stored as users authenticate via Azure AD or OAuth
  // emailVerified is set to null - they'll verify on first login
  const user = await prisma.user.create({
    data: userData,
    include: {
      _count: {
        select: {
          assets: true,
          subscriptions: true,
        },
      },
      hrProfile: {
        select: {
          employeeId: true,
          designation: true,
        }
      }
    },
  });

  // Log activity (session already fetched above)
  if (session) {
    await logAction(
      session.user.id,
      ActivityActions.USER_CREATED,
      'User',
      user.id,
      { userName: user.name, userEmail: user.email, userRole: user.role }
    );
  }

  // Note: Leave balances are initialized when the employee completes
  // their HR profile onboarding with dateOfJoining set

  // Send welcome email only to users who can login (non-blocking)
  if (canLogin && finalEmail && !finalEmail.endsWith('.internal')) {
    try {
      // Fetch organization with auth config for customized welcome email
      const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: {
          slug: true,
          customGoogleClientId: true,
          customAzureClientId: true,
          allowedAuthMethods: true,
        },
      });

      // Determine which auth methods are enabled
      // If allowedAuthMethods is empty, all methods are allowed (default)
      const allowedMethods = org?.allowedAuthMethods || [];
      const allMethodsAllowed = allowedMethods.length === 0;

      const hasGoogle = !!org?.customGoogleClientId && (allMethodsAllowed || allowedMethods.includes('google'));
      const hasMicrosoft = !!org?.customAzureClientId && (allMethodsAllowed || allowedMethods.includes('azure-ad'));
      const hasPassword = allMethodsAllowed || allowedMethods.includes('credentials');

      // Determine if we need to send password setup email
      // Send password setup email if:
      // 1. Password auth is allowed AND
      // 2. No SSO is configured (user must use password to login)
      const needsPasswordSetup = hasPassword && !hasGoogle && !hasMicrosoft;

      if (needsPasswordSetup) {
        // Generate setup token (7-day expiry)
        const setupToken = randomBytes(32).toString('hex');
        const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Update user with setup token
        await prisma.user.update({
          where: { id: user.id },
          data: { setupToken, setupTokenExpiry },
        });

        // Send welcome email with password setup link
        const emailContent = welcomeUserWithPasswordSetupEmail({
          userName: user.name || user.email,
          userEmail: user.email,
          userRole: user.role,
          orgSlug: org?.slug || 'app',
          setupToken,
        });
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } else {
        // Send regular welcome email (for SSO users or mixed auth)
        const emailContent = welcomeUserEmail({
          userName: user.name || user.email,
          userEmail: user.email,
          userRole: user.role,
          orgSlug: org?.slug || 'app',
          authMethods: {
            hasGoogle,
            hasMicrosoft,
            hasPassword,
          },
        });
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      }
    } catch (emailError) {
      console.error('[Email] Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json(user, { status: 201 });
}

export const POST = withErrorHandler(createUserHandler, { requireAdmin: true, rateLimit: true });