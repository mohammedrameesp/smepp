import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { TeamMemberRole, OrgRole } from '@prisma/client';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/invitations/[token] - Get invitation details
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            // Auth config for SSO on signup
            customGoogleClientId: true,
            customGoogleClientSecret: true,
            customAzureClientId: true,
            customAzureClientSecret: true,
            allowedAuthMethods: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
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

    // Check if OAuth is properly configured (both client ID and secret exist)
    const hasCustomGoogleOAuth = !!(
      invitation.organization.customGoogleClientId &&
      invitation.organization.customGoogleClientSecret
    );
    const hasCustomAzureOAuth = !!(
      invitation.organization.customAzureClientId &&
      invitation.organization.customAzureClientSecret
    );

    // Check if auth methods are allowed (empty array = all allowed)
    const allowedMethods = invitation.organization.allowedAuthMethods || [];
    const isGoogleAllowed = allowedMethods.length === 0 || allowedMethods.includes('google');
    const isAzureAllowed = allowedMethods.length === 0 || allowedMethods.includes('azure-ad');

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        // Employee status - null means user needs to confirm during acceptance
        isEmployee: invitation.isEmployee,
        isOnWps: invitation.isOnWps,
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
          logoUrl: invitation.organization.logoUrl,
        },
        expiresAt: invitation.expiresAt,
        // Auth config for signup page (don't expose secrets)
        authConfig: {
          hasCustomGoogleOAuth: hasCustomGoogleOAuth && isGoogleAllowed,
          hasCustomAzureOAuth: hasCustomAzureOAuth && isAzureAllowed,
        },
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get invitation');
    return NextResponse.json(
      { error: 'Failed to get invitation' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/invitations/[token] - Accept invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { token } = await params;

    // Use a transaction with all validation and creation inside to prevent race conditions
    // This ensures atomic check-and-create behavior
    const result = await prisma.$transaction(async (tx) => {
      // Find and lock the invitation row to prevent concurrent acceptance
      const invitation = await tx.organizationInvitation.findUnique({
        where: { token },
        include: {
          organization: true,
        },
      });

      if (!invitation) {
        return { error: 'Invitation not found', status: 404 };
      }

      if (invitation.acceptedAt) {
        return { error: 'This invitation has already been used', status: 410 };
      }

      if (invitation.expiresAt < new Date()) {
        return { error: 'Invitation has expired', status: 410 };
      }

      // Check if user email matches invitation
      if (invitation.email.toLowerCase() !== session.user.email?.toLowerCase()) {
        return { error: 'This invitation was sent to a different email address', status: 403 };
      }

      // Verify user still exists in database
      const userExists = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });

      if (!userExists) {
        return { error: 'Your session is invalid. Please sign out and sign in again.', status: 401 };
      }

      // Check if user is already a member (check TeamMember by email)
      const existingMembership = await tx.teamMember.findFirst({
        where: {
          tenantId: invitation.organizationId,
          email: session.user.email?.toLowerCase(),
          isDeleted: false,
        },
      });

      if (existingMembership) {
        // Mark invitation as accepted since user is already a member
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        return {
          success: true,
          alreadyMember: true,
          message: 'You are already a member of this organization',
          organization: {
            id: invitation.organization.id,
            name: invitation.organization.name,
            slug: invitation.organization.slug,
          },
        };
      }

      // Accept invitation: create TeamMember and mark as accepted
      const isOwner = invitation.role === 'OWNER';

      // Use employee status from invitation (set by admin)
      const finalIsEmployee = invitation.isEmployee ?? true; // Default to employee if somehow null
      const finalIsOnWps = finalIsEmployee ? (invitation.isOnWps ?? false) : false;

      // Map OrgRole to TeamMemberRole
      const teamMemberRole: TeamMemberRole =
        invitation.role === OrgRole.OWNER || invitation.role === OrgRole.ADMIN
          ? TeamMemberRole.ADMIN
          : TeamMemberRole.MEMBER;

      // Check if TeamMember already exists for this email in this org
      // (This happens when admin creates member via Add Member form for SSO orgs)
      const existingTeamMember = await tx.teamMember.findUnique({
        where: {
          tenantId_email: {
            tenantId: invitation.organizationId,
            email: session.user.email!.toLowerCase(),
          },
        },
      });

      if (existingTeamMember) {
        // Get user data to update TeamMember with (e.g., profile image from SSO)
        const userData = await tx.user.findUnique({
          where: { id: session.user.id },
          select: {
            image: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        // Update TeamMember with user data (profile image from SSO, etc.)
        // Only update if TeamMember hasn't set these values yet
        await tx.teamMember.update({
          where: { id: existingTeamMember.id },
          data: {
            // Update image from SSO if not already set (but only for employees)
            // Non-employees keep org logo as their image
            ...(existingTeamMember.isEmployee && !existingTeamMember.image && userData?.image
              ? { image: userData.image }
              : {}),
            // Copy password hash if available (for credentials fallback)
            ...(userData?.passwordHash && !existingTeamMember.passwordHash
              ? { passwordHash: userData.passwordHash }
              : {}),
            // Set email verified if verified by OAuth
            ...(userData?.emailVerified && !existingTeamMember.emailVerified
              ? { emailVerified: userData.emailVerified }
              : {}),
            // Set joinedAt if not already set
            ...(!existingTeamMember.joinedAt ? { joinedAt: new Date() } : {}),
          },
        });

        // Mark invitation as accepted
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { acceptedAt: new Date() },
        });

        return {
          success: true,
          alreadyMember: true,
          message: 'You have successfully joined this organization',
          organization: {
            id: invitation.organization.id,
            name: invitation.organization.name,
            slug: invitation.organization.slug,
          },
        };
      }

      // Get user data to copy password hash (for credentials login)
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          image: true,
          passwordHash: true,
          emailVerified: true,
        },
      });

      // Generate employee code for employees using organization's code prefix
      let employeeCode: string | null = null;
      if (finalIsEmployee) {
        const year = new Date().getFullYear();
        const orgPrefix = await getOrganizationCodePrefix(invitation.organizationId);
        const prefix = `${orgPrefix}-${year}`;
        const count = await tx.teamMember.count({
          where: {
            tenantId: invitation.organizationId,
            employeeCode: { startsWith: prefix },
          },
        });
        employeeCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
      }

      // Create TeamMember (the unified model)
      await tx.teamMember.create({
        data: {
          tenantId: invitation.organizationId,
          email: session.user.email!.toLowerCase(),
          name: invitation.name || user?.name || null,
          image: !finalIsEmployee && invitation.organization.logoUrl
            ? invitation.organization.logoUrl
            : user?.image || null,
          passwordHash: user?.passwordHash || null,
          emailVerified: user?.emailVerified || null,
          role: teamMemberRole,
          isOwner,
          isEmployee: finalIsEmployee,
          isOnWps: finalIsOnWps,
          employeeCode,
          canLogin: true,
          joinedAt: new Date(),
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return {
        success: true,
        message: 'Successfully joined organization',
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
        isEmployee: finalIsEmployee,
      };
    }, {
      // Use serializable isolation level to prevent race conditions
      isolationLevel: 'Serializable',
    });

    // Handle error responses from transaction
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to accept invitation');

    // Handle unique constraint violations (concurrent acceptance)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 410 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
