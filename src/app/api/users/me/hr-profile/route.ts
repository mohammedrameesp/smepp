/**
 * @file route.ts
 * @description Current user's HR profile management (self-service onboarding)
 * @module system/users
 *
 * NOTE: This endpoint now reads/writes to TeamMember instead of the deprecated HRProfile.
 * The response format is maintained for backwards compatibility with the frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { hrProfileSchema, hrProfileEmployeeSchema } from '@/lib/validations/hr-profile';
import { withErrorHandler } from '@/lib/http/handler';
import { TeamMemberRole } from '@prisma/client';
import { sendEmail } from '@/lib/core/email';
import { initializeMemberLeaveBalances } from '@/features/leave/lib/leave-balance-init';

// GET /api/users/me/hr-profile - Get current user's HR profile (now from TeamMember)
async function getHRProfileHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Ensure user has an organization
  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: 'Organization context required. Please ensure you are logged in with an organization.' },
      { status: 400 }
    );
  }

  try {
    // Get TeamMember (which now contains all HR data)
    const member = await prisma.teamMember.findUnique({
      where: { id: session.user.id },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Return data in format compatible with old HRProfile responses
    return NextResponse.json({
      id: member.id,
      userId: member.id, // For backwards compatibility
      tenantId: member.tenantId,
      // Personal info
      dateOfBirth: member.dateOfBirth,
      gender: member.gender,
      maritalStatus: member.maritalStatus,
      nationality: member.nationality,
      religion: member.religion,
      // Contact
      qatarMobile: member.qatarMobile,
      otherMobileCode: member.otherMobileCode,
      otherMobileNumber: member.otherMobileNumber,
      personalEmail: member.personalEmail,
      // Address
      qatarZone: member.qatarZone,
      qatarStreet: member.qatarStreet,
      qatarBuilding: member.qatarBuilding,
      qatarUnit: member.qatarUnit,
      homeCountryAddress: member.homeCountryAddress,
      // Emergency contacts - Local
      localEmergencyName: member.localEmergencyName,
      localEmergencyRelation: member.localEmergencyRelation,
      localEmergencyPhoneCode: member.localEmergencyPhoneCode,
      localEmergencyPhone: member.localEmergencyPhone,
      // Emergency contacts - Home
      homeEmergencyName: member.homeEmergencyName,
      homeEmergencyRelation: member.homeEmergencyRelation,
      homeEmergencyPhoneCode: member.homeEmergencyPhoneCode,
      homeEmergencyPhone: member.homeEmergencyPhone,
      // Identity documents
      qidNumber: member.qidNumber,
      qidExpiry: member.qidExpiry,
      passportNumber: member.passportNumber,
      passportExpiry: member.passportExpiry,
      healthCardExpiry: member.healthCardExpiry,
      sponsorshipType: member.sponsorshipType,
      // Employment
      employeeId: member.employeeCode, // Map to old field name
      designation: member.designation,
      dateOfJoining: member.dateOfJoining,
      status: member.status, // TeamMemberStatus: ACTIVE, INACTIVE, TERMINATED
      hajjLeaveTaken: member.hajjLeaveTaken,
      bypassNoticeRequirement: member.bypassNoticeRequirement,
      // Banking
      bankName: member.bankName,
      iban: member.iban,
      // Education
      highestQualification: member.highestQualification,
      specialization: member.specialization,
      institutionName: member.institutionName,
      graduationYear: member.graduationYear,
      // Documents
      qidUrl: member.qidUrl,
      passportCopyUrl: member.passportCopyUrl,
      photoUrl: member.photoUrl,
      contractCopyUrl: member.contractCopyUrl,
      contractExpiry: member.contractExpiry,
      // Driving
      hasDrivingLicense: member.hasDrivingLicense,
      licenseExpiry: member.licenseExpiry,
      // Skills
      languagesKnown: member.languagesKnown,
      skillsCertifications: member.skillsCertifications,
      // Onboarding
      onboardingStep: member.onboardingStep,
      onboardingComplete: member.onboardingComplete,
      // Metadata
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      // Computed fields
      workEmail: member.email,
      isAdmin: member.role === TeamMemberRole.ADMIN,
    });
  } catch (dbError) {
    console.error('[HR Profile GET] Database error:', dbError);
    return NextResponse.json(
      {
        error: 'Failed to load HR profile',
        message: dbError instanceof Error ? dbError.message : 'Database operation failed',
      },
      { status: 500 }
    );
  }
}

export const GET = withErrorHandler(getHRProfileHandler, { requireAuth: true, rateLimit: true });

// PATCH /api/users/me/hr-profile - Update current user's HR profile (now updates TeamMember)
async function updateHRProfileHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Ensure user has an organization
  if (!session.user.organizationId) {
    return NextResponse.json(
      { error: 'Organization context required. Please ensure you are logged in with an organization.' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  // Get member to check role
  const member = await prisma.teamMember.findUnique({
    where: { id: session.user.id },
    select: { role: true, onboardingComplete: true, dateOfJoining: true },
  });

  if (!member) {
    return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
  }

  const isAdmin = member.role === TeamMemberRole.ADMIN;

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

  // Whitelist of allowed TeamMember fields for HR profile updates
  const allowedFields = new Set([
    'dateOfBirth', 'gender', 'maritalStatus', 'nationality', 'religion',
    'qatarMobile', 'otherMobileCode', 'otherMobileNumber', 'personalEmail',
    'qatarZone', 'qatarStreet', 'qatarBuilding', 'qatarUnit', 'homeCountryAddress',
    'localEmergencyName', 'localEmergencyRelation', 'localEmergencyPhoneCode', 'localEmergencyPhone',
    'homeEmergencyName', 'homeEmergencyRelation', 'homeEmergencyPhoneCode', 'homeEmergencyPhone',
    'qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry', 'healthCardExpiry', 'sponsorshipType',
    'designation', 'dateOfJoining',
    'bankName', 'iban',
    'highestQualification', 'specialization', 'institutionName', 'graduationYear',
    'qidUrl', 'passportCopyUrl', 'photoUrl', 'contractCopyUrl', 'contractExpiry',
    'hasDrivingLicense', 'licenseExpiry', 'languagesKnown', 'skillsCertifications',
    'onboardingStep', 'onboardingComplete', 'bypassNoticeRequirement',
  ]);

  // Map old field names to new TeamMember field names
  const fieldMapping: Record<string, string> = {
    'employeeId': 'employeeCode',
  };

  // Filter to only allowed fields and apply mapping
  const processedData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const mappedKey = fieldMapping[key] || key;
    if (allowedFields.has(mappedKey) || allowedFields.has(key)) {
      processedData[mappedKey] = value;
    }
  }

  // Process date fields
  const dateFields = [
    'dateOfBirth',
    'qidExpiry',
    'passportExpiry',
    'healthCardExpiry',
    'dateOfJoining',
    'licenseExpiry',
    'contractExpiry',
  ];

  dateFields.forEach((field) => {
    const value = processedData[field];
    if (value && typeof value === 'string') {
      processedData[field] = new Date(value);
    } else if (value === '' || value === null) {
      processedData[field] = null;
    }
  });

  // Remove employeeCode if not admin (extra safety check)
  if (!isAdmin && 'employeeCode' in processedData) {
    delete processedData.employeeCode;
  }

  // Check if onboarding is being completed for the first time
  const wasOnboardingComplete = member.onboardingComplete ?? false;
  const isNowOnboardingComplete = processedData.onboardingComplete === true;
  const justCompletedOnboarding = !wasOnboardingComplete && isNowOnboardingComplete;

  // Update TeamMember
  let updatedMember;
  try {
    updatedMember = await prisma.teamMember.update({
      where: { id: session.user.id },
      data: processedData,
    });
  } catch (dbError) {
    console.error('[HR Profile] Database error during update:', dbError);
    console.error('[HR Profile] Processed data:', JSON.stringify(processedData, null, 2));
    return NextResponse.json(
      {
        error: 'Failed to save HR profile',
        message: dbError instanceof Error ? dbError.message : 'Database operation failed',
      },
      { status: 500 }
    );
  }

  // Log activity
  await logAction(
    session.user.organizationId!,
    session.user.id,
    ActivityActions.USER_UPDATED,
    'TeamMember',
    updatedMember.id,
    { changes: Object.keys(data) }
  );

  // Send email notification to admins when onboarding is completed
  if (justCompletedOnboarding) {
    try {
      // Get organization name
      const org = await prisma.organization.findUnique({
        where: { id: session.user.organizationId! },
        select: { name: true },
      });
      const orgName = org?.name || 'Durj';

      // Get all admin members (tenant-scoped)
      const admins = await prisma.teamMember.findMany({
        where: {
          tenantId: session.user.organizationId!,
          role: TeamMemberRole.ADMIN,
          isDeleted: false,
          id: { not: session.user.id }, // Don't notify the user themselves
        },
        select: { email: true, name: true },
      });

      // Send email to each admin
      const employeeName = updatedMember.name || updatedMember.email || 'An employee';
      const employeeEmail = updatedMember.email;

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
    if (updatedMember.dateOfJoining) {
      try {
        await initializeMemberLeaveBalances(session.user.id, new Date().getFullYear(), session.user.organizationId!);
      } catch (leaveError) {
        console.error('[Leave] Failed to initialize leave balances on onboarding completion:', leaveError);
        // Don't fail the request if leave balance initialization fails
      }
    }
  }

  return NextResponse.json({
    id: updatedMember.id,
    userId: updatedMember.id, // For backwards compatibility
    message: 'HR Profile updated successfully',
  });
}

export const PATCH = withErrorHandler(updateHRProfileHandler, { requireAuth: true, rateLimit: true });
