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
  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const includeHrProfile = searchParams.get('includeHrProfile') === 'true';
  const includeAll = searchParams.get('includeAll') === 'true';

  // Build where clause
  const where: any = {};
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

  // Return wrapped format when includeHrProfile or includeAll is used for consistency with other APIs
  // Otherwise return array directly for backward compatibility
  if (includeHrProfile || includeAll) {
    return NextResponse.json({ users });
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

  const { name, email, role, employeeId, designation } = validation.data;

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: 'User with this email already exists' },
      { status: 409 }
    );
  }

  // Generate employee code if not provided
  let finalEmployeeId = employeeId;
  if (!finalEmployeeId) {
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

  // Create user with HR profile in a transaction
  // Note: Password is not stored as users authenticate via Azure AD or OAuth
  // emailVerified is set to null - they'll verify on first login
  const session = await getServerSession(authOptions);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      emailVerified: null,
      hrProfile: {
        create: {
          employeeId: finalEmployeeId,
          designation: designation || null,
          onboardingComplete: false,
          onboardingStep: 0,
          tenantId: session?.user.organizationId!,
        }
      }
    },
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

  // Initialize leave balances for the new user (non-blocking)
  try {
    await initializeUserLeaveBalances(user.id);
  } catch (leaveError) {
    console.error('[Leave] Failed to initialize leave balances:', leaveError);
    // Don't fail the request if leave balance initialization fails
  }

  // Send welcome email to the new user (non-blocking)
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

  return NextResponse.json(user, { status: 201 });
}

export const POST = withErrorHandler(createUserHandler, { requireAdmin: true, rateLimit: true });