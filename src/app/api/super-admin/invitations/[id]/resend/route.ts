import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/core/email';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/invitations/[id]/resend - Resend/regenerate invitation
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Find the invitation
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if invitation was already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // Generate new token and extend expiry
    const newToken = randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update the invitation
    const updatedInvitation = await prisma.organizationInvitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
    });

    // Build organization-specific invite URL using subdomain
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${invitation.organization.slug}.${appDomain}/invite/${newToken}`;
    const orgName = invitation.organization.name;
    const greeting = invitation.name ? `Dear ${invitation.name}` : 'Hello';

    // Send invitation email (email-client safe styling)
    const emailResult = await sendEmail({
      to: invitation.email,
      subject: `Reminder: You're invited to join ${orgName} on Durj`,
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
            <td align="center" style="background-color: #2563eb; padding: 40px 40px 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">Durj</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Business Management Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">Invitation Reminder</h2>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                ${greeting},
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                This is a reminder that you've been invited to join <strong style="color: #1e293b;">"${orgName}"</strong> on Durj.
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 30px; font-family: Arial, Helvetica, sans-serif;">
                Click the button below to accept the invitation:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #2563eb; border-radius: 6px;">
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
                <a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
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
                © ${new Date().getFullYear()} Durj. All rights reserved.
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
      text: `${greeting},

This is a reminder that you've been invited to join "${orgName}" on Durj.

Accept your invitation: ${inviteUrl}

Note: This invitation will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

- The Durj Team`,
    });

    return NextResponse.json({
      success: true,
      emailSent: emailResult.success,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        inviteUrl,
        expiresAt: newExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
