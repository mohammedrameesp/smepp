import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { sendEmail } from '@/lib/core/email';
import {
  welcomeUserWithPasswordSetupEmail,
  organizationInvitationEmail,
} from '@/lib/core/email-templates';
import { randomBytes } from 'crypto';
import logger from '@/lib/core/log';

interface RouteContext {
  params: Promise<{ memberId: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/team/[memberId]/resend - Resend invitation/setup email
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only org admins/owners can resend
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { memberId } = await context.params;
    const body = await request.json();
    const pendingType = body.type as 'credentials' | 'sso' | null;

    // Find the team member
    const member = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        tenantId: session.user.organizationId,
        isDeleted: false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Get organization info
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
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
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const hasGoogle = !!(org.customGoogleClientId && org.customGoogleClientSecret);
    const hasMicrosoft = !!(org.customAzureClientId && org.customAzureClientSecret);

    if (pendingType === 'credentials') {
      // Regenerate setup token and resend password setup email
      const setupToken = randomBytes(32).toString('hex');
      const setupTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.teamMember.update({
        where: { id: member.id },
        data: { setupToken, setupTokenExpiry },
      });

      // Send password setup email
      const emailContent = welcomeUserWithPasswordSetupEmail({
        userName: member.name || member.email,
        userEmail: member.email,
        userRole: member.isAdmin ? 'ADMIN' : 'MEMBER',
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
          organizationId: session.user.organizationId,
          email: member.email,
        },
      });

      // Create new invitation
      await prisma.organizationInvitation.create({
        data: {
          organizationId: session.user.organizationId,
          email: member.email,
          name: member.name,
          role: member.isAdmin ? 'ADMIN' : 'MEMBER',
          token: inviteToken,
          isEmployee: member.isEmployee,
          isOnWps: member.isEmployee ? member.isOnWps : null,
          invitedById: session.user.id,
          expiresAt,
        },
      });

      // Send invitation email
      const emailContent = organizationInvitationEmail({
        userName: member.name || member.email,
        userEmail: member.email,
        userRole: member.isAdmin ? 'ADMIN' : 'MEMBER',
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
      return NextResponse.json({ error: 'Invalid pending type' }, { status: 400 });
    }
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to resend member invitation');
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
