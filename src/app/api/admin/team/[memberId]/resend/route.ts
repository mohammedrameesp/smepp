/**
 * @module api/admin/team/[memberId]/resend
 * @description Resend invitation or setup email endpoint. Supports both credential-based
 * password setup emails and SSO invitation emails. Regenerates tokens and extends
 * expiration for pending members.
 *
 * @endpoints
 * - POST /api/admin/team/[memberId]/resend - Resend setup/invitation email
 *   Body: { type: 'credentials' | 'sso' }
 *
 * @security
 * - Requires authentication (requireAuth: true)
 * - Requires admin role (requireAdmin: true)
 * - Validates member belongs to tenant organization
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { sendEmail, welcomeUserWithPasswordSetupEmail, organizationInvitationEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { withErrorHandler } from '@/lib/http/handler';
import { notFoundResponse, badRequestResponse } from '@/lib/http/errors';
import { deriveOrgRole } from '@/lib/access-control';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/team/[memberId]/resend - Resend invitation/setup email
// ═══════════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandler(async (request: NextRequest, { tenant, params }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const memberId = params?.memberId;

  if (!memberId) {
    return badRequestResponse('Member ID is required');
  }

  const body = await request.json();
  const pendingType = body.type as 'credentials' | 'sso' | null;

  // Find the team member (without user relation for production compatibility)
  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      tenantId,
      isDeleted: false,
    },
  });

  if (!member) {
    return notFoundResponse('Member');
  }

  // Get User by email (production schema compatibility)
  const memberUser = await prisma.user.findUnique({
    where: { email: member.email.toLowerCase() },
    select: { id: true },
  });

  // Get organization info
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      slug: true,
      name: true,
      primaryColor: true,
      customGoogleClientId: true,
      customGoogleClientSecret: true,
      customAzureClientId: true,
      customAzureClientSecret: true,
    },
  });

  if (!org) {
    return notFoundResponse('Organization');
  }

  const hasGoogle = !!(org.customGoogleClientId && org.customGoogleClientSecret);
  const hasMicrosoft = !!(org.customAzureClientId && org.customAzureClientSecret);

  if (pendingType === 'credentials') {
    if (!memberUser) {
      return badRequestResponse('User account not found for this member');
    }

    // Regenerate setup token and resend password setup email
    const setupToken = randomBytes(32).toString('hex');
    const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update User with setup token (auth data on User, not TeamMember)
    await prisma.user.update({
      where: { id: memberUser.id },
      data: { setupToken, setupTokenExpiry },
    });

    // Send password setup email
    const emailContent = welcomeUserWithPasswordSetupEmail({
      userName: member.name || member.email,
      userEmail: member.email,
      userRole: deriveOrgRole(member),
      orgSlug: org.slug,
      orgName: org.name,
      setupToken,
      primaryColor: org.primaryColor,
    });

    await sendEmail({
      to: member.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      message: 'Password setup email resent',
    });
  } else if (pendingType === 'sso') {
    // Find existing invitation and update or create new one
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Delete any existing invitation for this email
    await prisma.organizationInvitation.deleteMany({
      where: {
        organizationId: tenantId,
        email: member.email,
      },
    });

    // Create new invitation
    await prisma.organizationInvitation.create({
      data: {
        organizationId: tenantId,
        email: member.email,
        name: member.name,
        role: deriveOrgRole(member),
        token: inviteToken,
        isEmployee: member.isEmployee,
        isOnWps: member.isEmployee ? member.isOnWps : null,
        invitedById: userId,
        expiresAt,
      },
    });

    // Send invitation email
    const emailContent = organizationInvitationEmail({
      userName: member.name || member.email,
      userEmail: member.email,
      userRole: deriveOrgRole(member),
      orgSlug: org.slug,
      orgName: org.name,
      inviteToken,
      authMethods: { hasGoogle, hasMicrosoft },
      designation: member.designation,
      employeeCode: member.employeeCode,
      primaryColor: org.primaryColor,
    });

    await sendEmail({
      to: member.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation email resent',
    });
  } else {
    return badRequestResponse('Invalid pending type');
  }
}, { requireAuth: true, requireAdmin: true });

/*
 * =============================================================================
 * CODE REVIEW SUMMARY
 * =============================================================================
 *
 * Purpose:
 * Resends setup or invitation emails to pending team members. Handles both
 * credential-based password setup and SSO invitation flows with token
 * regeneration and email dispatch.
 *
 * Strengths:
 * - Supports both auth flows (credentials and SSO) in single endpoint
 * - Regenerates tokens with fresh 7-day expiration
 * - Deletes old SSO invitations before creating new ones (prevents duplicates)
 * - Uses typed email templates for consistent messaging
 * - Properly validates member belongs to tenant
 * - Includes organization branding (primaryColor) in emails
 *
 * Concerns:
 * - [LOW] No rate limiting - could allow email spam
 * - [LOW] No validation of pendingType against member's actual pending state
 *   (could send wrong email type)
 *
 * Recommendations:
 * - Add rate limiting per member to prevent abuse
 * - Verify member actually has the claimed pending type before sending
 * - Consider logging resend events for audit trail
 *
 * Status: APPROVED - Functional resend with minor enhancement opportunities
 * Last Reviewed: 2026-02-01
 * =============================================================================
 */
