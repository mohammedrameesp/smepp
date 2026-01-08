/**
 * @file route.ts
 * @description HR profile management for a specific team member (admin only)
 * @module system/users
 *
 * NOTE: This endpoint now operates directly on TeamMember (the unified model).
 * The [id] parameter is the TeamMember ID, not User ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { hrProfileSchema } from '@/lib/validations/hr-profile';
import { TeamMemberRole } from '@prisma/client';
import { reinitializeMemberLeaveBalances } from '@/features/leave/lib/leave-balance-init';

// GET /api/users/[id]/hr-profile - Get a team member's HR profile (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Get the requesting member to check if admin
    const requestingMember = await prisma.teamMember.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    // Only admins can view other users' HR profiles
    if (requestingMember?.role !== TeamMemberRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find the TeamMember by ID within same tenant
    const member = await prisma.teamMember.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Return TeamMember data in format compatible with HR profile UI
    return NextResponse.json({
      id: member.id,
      odIdd: member.id, // For backwards compatibility
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
      // Emergency contacts
      localEmergencyName: member.localEmergencyName,
      localEmergencyRelation: member.localEmergencyRelation,
      localEmergencyPhoneCode: member.localEmergencyPhoneCode,
      localEmergencyPhone: member.localEmergencyPhone,
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
      employeeId: member.employeeCode,
      designation: member.designation,
      dateOfJoining: member.dateOfJoining,
      status: member.status, // TeamMemberStatus: ACTIVE, INACTIVE, TERMINATED
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
      // Payroll
      isOnWps: member.isOnWps,
      // Onboarding
      onboardingStep: member.onboardingStep,
      onboardingComplete: member.onboardingComplete,
      bypassNoticeRequirement: member.bypassNoticeRequirement,
      // Metadata
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      // User info for display
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.approvalRole, // Approval role for dropdown
      },
      workEmail: member.email,
      isAdmin: member.role === 'ADMIN', // Dashboard access (TeamMemberRole)
    });
  } catch (error) {
    console.error('Get HR Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch HR profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/users/[id]/hr-profile - Update a team member's HR profile (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Get the requesting member to check if admin
    const requestingMember = await prisma.teamMember.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    // Only admins can edit other users' HR profiles
    if (requestingMember?.role !== TeamMemberRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if TeamMember exists and belongs to same organization
    const member = await prisma.teamMember.findFirst({
      where: {
        id,
        tenantId,
        isDeleted: false,
      },
      select: { id: true, email: true, dateOfJoining: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = hrProfileSchema.safeParse(body);

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

    // Remove fields that shouldn't be persisted
    const fieldsToRemove = ['id', 'userId', 'workEmail', 'isAdmin', 'createdAt', 'updatedAt', 'user'];
    fieldsToRemove.forEach((field) => {
      delete processedData[field];
    });

    // Map old field names to new
    if ('employeeId' in processedData) {
      processedData.employeeCode = processedData.employeeId;
      delete processedData.employeeId;
    }

    // Convert empty strings to null for enum fields (Prisma requires null, not empty string)
    const enumFields = ['gender', 'maritalStatus', 'sponsorshipType'];
    enumFields.forEach((field) => {
      if (processedData[field] === '') {
        processedData[field] = null;
      }
    });

    // Convert empty strings to null for optional string fields
    const optionalStringFields = [
      'nationality', 'religion', 'qatarMobile', 'otherMobileCode', 'otherMobileNumber',
      'personalEmail', 'qatarZone', 'qatarStreet', 'qatarBuilding', 'qatarUnit',
      'homeCountryAddress', 'localEmergencyName', 'localEmergencyRelation',
      'localEmergencyPhoneCode', 'localEmergencyPhone', 'homeEmergencyName',
      'homeEmergencyRelation', 'homeEmergencyPhoneCode', 'homeEmergencyPhone',
      'qidNumber', 'passportNumber', 'designation', 'bankName', 'iban',
      'highestQualification', 'specialization', 'institutionName',
      'qidUrl', 'passportCopyUrl', 'photoUrl', 'contractCopyUrl',
      'languagesKnown', 'skillsCertifications', 'licenseNumber',
    ];
    optionalStringFields.forEach((field) => {
      if (processedData[field] === '') {
        processedData[field] = null;
      }
    });

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

    // Update TeamMember
    const updatedMember = await prisma.teamMember.update({
      where: { id },
      data: processedData,
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.USER_UPDATED,
      'TeamMember',
      updatedMember.id,
      {
        targetMemberId: id,
        targetMemberEmail: member.email,
        changes: Object.keys(data),
      }
    );

    // If dateOfJoining was updated, reinitialize leave balances
    const oldDateOfJoining = member.dateOfJoining?.toISOString();
    const newDateOfJoining = updatedMember.dateOfJoining?.toISOString();
    if (oldDateOfJoining !== newDateOfJoining && updatedMember.dateOfJoining) {
      try {
        await reinitializeMemberLeaveBalances(id);
      } catch (leaveError) {
        console.error('[Leave] Failed to reinitialize leave balances:', leaveError);
        // Don't fail the request if leave balance reinitialization fails
      }
    }

    return NextResponse.json({
      id: updatedMember.id,
      userId: updatedMember.id, // For backwards compatibility
      message: 'HR Profile updated successfully',
    });
  } catch (error) {
    console.error('Update HR Profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update HR profile' },
      { status: 500 }
    );
  }
}
