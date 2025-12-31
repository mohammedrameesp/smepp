/**
 * @file route.ts
 * @description Current user's HR profile management (self-service onboarding)
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/activity';
import { hrProfileSchema, hrProfileEmployeeSchema } from '@/lib/validations/hr-profile';
import { withErrorHandler } from '@/lib/http/handler';
import { Role } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { initializeUserLeaveBalances } from '@/lib/leave-balance-init';

// GET /api/users/me/hr-profile - Get current user's HR profile
async function getHRProfileHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Find or create HR profile for current user
  let hrProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
  });

  // Create empty profile if none exists
  if (!hrProfile) {
    hrProfile = await prisma.hRProfile.create({
      data: {
        userId: session.user.id,
        tenantId: session.user.organizationId!,
      },
    });
  }

  // Get user info for workEmail
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      role: true,
    },
  });

  return NextResponse.json({
    ...hrProfile,
    workEmail: user?.email,
    isAdmin: user?.role === Role.ADMIN,
  });
}

export const GET = withErrorHandler(getHRProfileHandler, { requireAuth: true, rateLimit: true });

// PATCH /api/users/me/hr-profile - Update current user's HR profile
async function updateHRProfileHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();

  // Get user role to determine if admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const isAdmin = user?.role === Role.ADMIN;

  // Use appropriate schema based on role
  const schema = isAdmin ? hrProfileSchema : hrProfileEmployeeSchema;
  const validation = schema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid request body',
        details: validation.error.issues,
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  // Convert date strings to Date objects for Prisma
  const processedData: Record<string, unknown> = { ...data };

  // Remove fields that shouldn't be persisted (passed through from frontend)
  const fieldsToRemove = ['id', 'userId', 'workEmail', 'isAdmin', 'createdAt', 'updatedAt', 'user'];
  fieldsToRemove.forEach((field) => {
    delete processedData[field];
  });

  const dateFields = [
    'dateOfBirth',
    'qidExpiry',
    'passportExpiry',
    'healthCardExpiry',
    'dateOfJoining',
    'licenseExpiry',
  ];

  dateFields.forEach((field) => {
    const value = processedData[field];
    if (value && typeof value === 'string') {
      processedData[field] = new Date(value);
    } else if (value === '' || value === null) {
      processedData[field] = null;
    }
  });

  // Remove employeeId if not admin (extra safety check)
  if (!isAdmin && 'employeeId' in processedData) {
    delete processedData.employeeId;
  }

  // Check if onboarding is being completed for the first time
  const existingProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
  });
  const wasOnboardingComplete = existingProfile?.onboardingComplete ?? false;
  const isNowOnboardingComplete = processedData.onboardingComplete === true;
  const justCompletedOnboarding = !wasOnboardingComplete && isNowOnboardingComplete;

  // Upsert HR profile
  const hrProfile = await prisma.hRProfile.upsert({
    where: { userId: session.user.id },
    update: processedData,
    create: {
      userId: session.user.id,
      tenantId: session.user.organizationId!,
      ...processedData,
    },
  });

  // Log activity
  await logAction(
    session.user.organizationId!,
    session.user.id,
    ActivityActions.USER_UPDATED,
    'HRProfile',
    hrProfile.id,
    { changes: Object.keys(data) }
  );

  // Send email notification to admins when onboarding is completed
  if (justCompletedOnboarding) {
    try {
      // Get current user info and organization
      const [currentUser, org] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true, email: true },
        }),
        prisma.organization.findUnique({
          where: { id: session.user.organizationId! },
          select: { name: true },
        }),
      ]);
      const orgName = org?.name || 'Durj';

      // Get all admin users (tenant-scoped)
      const admins = await prisma.user.findMany({
        where: {
          role: Role.ADMIN,
          isSystemAccount: false,
          organizationMemberships: { some: { organizationId: session.user.organizationId! } },
        },
        select: { email: true, name: true },
      });

      // Send email to each admin
      const employeeName = currentUser?.name || currentUser?.email || 'An employee';
      const employeeEmail = currentUser?.email || 'unknown';

      for (const admin of admins) {
        await sendEmail({
          to: admin.email,
          subject: `[HR] ${employeeName} has completed onboarding`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a1a;">Employee Onboarding Completed</h2>
              <p style="color: #4b5563;">
                <strong>${employeeName}</strong> (${employeeEmail}) has completed their HR profile onboarding.
              </p>
              <p style="color: #4b5563;">
                You can view their profile in the Employee Management section of the portal.
              </p>
              <div style="margin-top: 24px;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/employees/${session.user.id}"
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                  View Profile
                </a>
              </div>
              <p style="margin-top: 32px; color: #9ca3af; font-size: 12px;">
                This is an automated message from ${orgName}.
              </p>
            </div>
          `,
          text: `${employeeName} (${employeeEmail}) has completed their HR profile onboarding. View their profile at ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/employees/${session.user.id}`,
        });
      }
    } catch (emailError) {
      // Log error but don't fail the request
      console.error('Failed to send onboarding completion email:', emailError);
    }

    // Initialize leave balances when onboarding is completed with dateOfJoining
    if (hrProfile.dateOfJoining) {
      try {
        await initializeUserLeaveBalances(session.user.id, new Date().getFullYear(), session.user.organizationId!);
      } catch (leaveError) {
        console.error('[Leave] Failed to initialize leave balances on onboarding completion:', leaveError);
        // Don't fail the request if leave balance initialization fails
      }
    }
  }

  return NextResponse.json({
    ...hrProfile,
    message: 'HR Profile updated successfully',
  });
}

export const PATCH = withErrorHandler(updateHRProfileHandler, { requireAuth: true, rateLimit: true });
