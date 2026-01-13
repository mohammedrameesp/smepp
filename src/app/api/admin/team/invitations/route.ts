import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { sendEmail } from '@/lib/core/email';
import { updateSetupProgress } from '@/features/onboarding/lib';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/admin/team/invitations - Get pending invitations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins/owners can view invitations
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const invitations = await prisma.organizationInvitation.findMany({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: inv.expiresAt < now,
      })),
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to get invitations');
    return NextResponse.json(
      { error: 'Failed to get invitations' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/team/invitations - Create new invitation
// ═══════════════════════════════════════════════════════════════════════════════

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
  isEmployee: z.boolean().optional(),
  onWPS: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins/owners can invite
    if (session.user.orgRole !== 'OWNER' && session.user.orgRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const result = createInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, role, isEmployee, onWPS } = result.data;

    // Check org limits
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        maxUsers: true,
        _count: { select: { teamMembers: true } },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Count pending invitations too
    const pendingCount = await prisma.organizationInvitation.count({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
      },
    });

    if (org._count.teamMembers + pendingCount >= org.maxUsers) {
      return NextResponse.json(
        { error: `User limit reached (${org.maxUsers}). Upgrade your plan to add more users.` },
        { status: 403 }
      );
    }

    // Check if user is already a TeamMember (primary check)
    const existingTeamMember = await prisma.teamMember.findFirst({
      where: {
        tenantId: session.user.organizationId,
        email: email.toLowerCase(),
        isDeleted: false,
      },
    });

    if (existingTeamMember) {
      return NextResponse.json(
        { error: 'This user is already a member of your organization' },
        { status: 409 }
      );
    }

    // Check for existing pending invitation
    const existingInvite = await prisma.organizationInvitation.findFirst({
      where: {
        organizationId: session.user.organizationId,
        email: email.toLowerCase(),
        acceptedAt: null,
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invitation for this email already exists' },
        { status: 409 }
      );
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.organizationInvitation.create({
      data: {
        organizationId: session.user.organizationId,
        email: email.toLowerCase(),
        role,
        token,
        expiresAt,
        invitedById: session.user.id,
        isEmployee: isEmployee,
        isOnWps: onWPS,
      },
    });

    // Build organization-specific invite URL using subdomain
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${org.slug}.${appDomain}/invite/${token}`;
    const inviterName = session.user.name || 'A team member';
    const roleName = role === 'ADMIN' ? 'Administrator' : role === 'MANAGER' ? 'Manager' : 'Team Member';

    // Send professional invitation email (email-client safe styling)
    const emailResult = await sendEmail({
      to: email,
      subject: `${inviterName} invited you to join ${org.name} on Durj`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f7fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: ${org.primaryColor || '#0f172a'}; padding: 40px 40px 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">${org.name}</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Team Invitation</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">You're Invited!</h2>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                Hello,
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                <strong style="color: #1e293b;">${inviterName}</strong> has invited you to join <strong style="color: #1e293b;">${org.name}</strong> on Durj as a <strong>${roleName}</strong>.
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 30px; font-family: Arial, Helvetica, sans-serif;">
                Click the button below to accept the invitation and join the team:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: ${org.primaryColor || '#0f172a'}; border-radius: 6px;">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="color: #64748b; font-size: 14px; line-height: 21px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                Or copy and paste this link into your browser:<br/>
                <a href="${inviteUrl}" style="color: #0f172a; word-break: break-all;">${inviteUrl}</a>
              </p>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                      <strong>Note:</strong> This invitation will expire in 7 days. Please accept it before the expiry date.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; line-height: 21px; margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif;">
                If you did not expect this invitation, you can safely ignore this email.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                © ${new Date().getFullYear()} ${org.name}. Powered by Durj.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Hello,

${inviterName} has invited you to join ${org.name} on Durj as a ${roleName}.

Accept your invitation: ${inviteUrl}

Note: This invitation will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

- The ${org.name} Team`,
    });

    // Update setup progress for first team member invited (non-blocking)
    updateSetupProgress(session.user.organizationId, 'firstTeamMemberInvited', true).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.success,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          inviteUrl,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to create invitation');
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
