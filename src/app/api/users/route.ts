import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createUserSchema } from '@/lib/validations/users';
import { logAction, ActivityActions } from '@/lib/activity';
import { withErrorHandler } from '@/lib/http/handler';
import { sendEmail } from '@/lib/email';
import { welcomeUserEmail } from '@/lib/email-templates';
import { initializeUserLeaveBalances } from '@/lib/leave-balance-init';

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

  // Build where clause with tenant filtering
  const where: any = {
    organizationMemberships: {
      some: { organizationId: session.user.organizationId },
    },
  };
  if (role) where.role = role;

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

  // Fetch users
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

  // Initialize leave balances for employees only (non-blocking)
  if (isEmployee) {
    try {
      await initializeUserLeaveBalances(user.id);
    } catch (leaveError) {
      console.error('[Leave] Failed to initialize leave balances:', leaveError);
      // Don't fail the request if leave balance initialization fails
    }
  }

  // Send welcome email only to users who can login (non-blocking)
  if (canLogin && finalEmail && !finalEmail.endsWith('.internal')) {
    try {
      const emailContent = welcomeUserEmail({
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
      });
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (emailError) {
      console.error('[Email] Failed to send welcome email:', emailError);
      // Don't fail the request if email fails
    }
  }

  return NextResponse.json(user, { status: 201 });
}

export const POST = withErrorHandler(createUserHandler, { requireAdmin: true, rateLimit: true });