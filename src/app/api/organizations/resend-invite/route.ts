import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import { sendEmail } from '@/lib/core/email';

// Rate limit: simple in-memory store (in production, use Redis)
const resendAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/organizations/resend-invite - Resend signup invitation (public)
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = resendSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const email = result.data.email.toLowerCase();

    // Rate limiting
    const now = Date.now();
    const attempts = resendAttempts.get(email);
    if (attempts) {
      if (now - attempts.lastAttempt < WINDOW_MS) {
        if (attempts.count >= MAX_ATTEMPTS) {
          return NextResponse.json(
            { error: 'Too many resend attempts. Please try again later.' },
            { status: 429 }
          );
        }
        attempts.count++;
        attempts.lastAttempt = now;
      } else {
        // Reset window
        resendAttempts.set(email, { count: 1, lastAttempt: now });
      }
    } else {
      resendAttempts.set(email, { count: 1, lastAttempt: now });
    }

    // Find pending invitation (OWNER role = signup invitation, not yet accepted)
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        email,
        role: 'OWNER',
        acceptedAt: null,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      // Don't reveal whether email exists - just say success
      return NextResponse.json({ success: true });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired. Please sign up again.' },
        { status: 410 }
      );
    }

    // Build invite URL using existing token
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${invitation.organization.slug}.${appDomain}/invite/${invitation.token}`;
    const greeting = invitation.name ? `Dear ${invitation.name}` : 'Hello';
    const orgName = invitation.organization.name;
    const slug = invitation.organization.slug;

    // Calculate days remaining
    const daysRemaining = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Send email
    await sendEmail({
      to: email,
      subject: `Your Durj Invitation Link - ${orgName}`,
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
          <tr>
            <td align="center" style="background-color: #0f172a; padding: 40px 40px 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">${orgName}</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Here's your new sign-in link</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px;">${greeting},</p>
              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                You requested a new sign-in link for your organization <strong style="color: #1e293b;">"${orgName}"</strong>. Click below to continue:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #0f172a; border-radius: 6px;">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                            Complete Your Setup
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Your Portal URL</p>
                    <p style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0; font-family: monospace;">${slug}.${appDomain.split(':')[0]}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                      <strong>Note:</strong> This link expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; line-height: 21px; margin: 0 0 10px;">
                If you didn't request this, you can safely ignore this email.
              </p>
              <p style="color: #64748b; font-size: 14px; line-height: 21px; margin: 0 0 10px;">
                Need help? Contact <a href="mailto:support@durj.qa" style="color: #0f172a;">support@durj.qa</a>
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
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

You requested a new sign-in link for your organization "${orgName}".

Complete your setup here: ${inviteUrl}

Your portal URL: ${slug}.${appDomain.split(':')[0]}

Note: This link expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.

If you didn't request this, you can safely ignore this email.

Need help? Contact support@durj.qa

© ${new Date().getFullYear()} Durj. All rights reserved.`,
    });

    logger.info({ email, organizationId: invitation.organization.id }, 'Resent signup invitation');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Resend invite error');
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
