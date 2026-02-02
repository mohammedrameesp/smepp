/**
 * @module api/organizations/resend-invite
 * @description Public API endpoint for resending organization signup invitations.
 * Allows users who haven't completed their organization setup to request a new
 * invitation email. Also supports changing the invitation email address.
 *
 * @endpoints
 * - POST /api/organizations/resend-invite - Resend signup invitation email
 *
 * @features
 * - In-memory rate limiting (3 attempts per 15 minutes)
 * - Email change support via slug + newEmail parameters
 * - Invitation expiry validation
 * - Branded HTML email with organization colors
 *
 * @security
 * - Public endpoint (no auth required)
 * - Rate limited per email/slug
 * - Does not reveal whether email exists (security through obscurity)
 *
 * @note In production, consider using Redis for rate limiting instead of in-memory Map
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

// Rate limit: simple in-memory store (in production, use Redis)
const resendAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const resendSchema = z.object({
  email: z.string().email('Invalid email address'),
  newEmail: z.string().email('Invalid email address').optional(),
  slug: z.string().optional(), // Organization slug for updating email
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

    const { email, newEmail, slug } = result.data;
    const emailLower = email.toLowerCase();
    const newEmailLower = newEmail?.toLowerCase();

    // Rate limiting based on email or slug
    const rateLimitKey = slug || emailLower;
    const now = Date.now();
    const attempts = resendAttempts.get(rateLimitKey);
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
        resendAttempts.set(rateLimitKey, { count: 1, lastAttempt: now });
      }
    } else {
      resendAttempts.set(rateLimitKey, { count: 1, lastAttempt: now });
    }

    // Find pending invitation
    // If slug is provided (changing email flow), find by org slug
    // Otherwise find by email (regular resend flow)
    let invitation;
    if (slug && newEmailLower) {
      // Changing email flow: find by org slug
      invitation = await prisma.organizationInvitation.findFirst({
        where: {
          organization: { slug },
          role: 'OWNER',
          acceptedAt: null,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              primaryColor: true,
            },
          },
        },
      });

      if (invitation) {
        // Check if new email is already used as an owner
        const existingOwner = await prisma.teamMember.findFirst({
          where: {
            email: newEmailLower,
            isOwner: true,
            isDeleted: false,
          },
        });

        if (existingOwner) {
          return NextResponse.json(
            { error: 'This email is already associated with an organization' },
            { status: 409 }
          );
        }

        // Update the invitation email
        await prisma.organizationInvitation.update({
          where: { id: invitation.id },
          data: { email: newEmailLower },
        });

        // Update invitation reference with new email for sending
        invitation = { ...invitation, email: newEmailLower };
      }
    } else {
      // Regular resend flow: find by email
      invitation = await prisma.organizationInvitation.findFirst({
        where: {
          email: emailLower,
          role: 'OWNER',
          acceptedAt: null,
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              primaryColor: true,
            },
          },
        },
      });
    }

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
    const orgSlug = invitation.organization.slug;
    const brandColor = invitation.organization.primaryColor || '#0f172a';

    // Calculate days remaining
    const daysRemaining = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Send email to the invitation email (which may have been updated)
    const recipientEmail = invitation.email;
    await sendEmail({
      to: recipientEmail,
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
            <td align="center" style="background-color: ${brandColor}; padding: 40px 40px 30px;">
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
                        <td align="center" style="background-color: ${brandColor}; border-radius: 6px;">
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
                    <p style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0; font-family: monospace;">${orgSlug}.${appDomain.split(':')[0]}</p>
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

Your portal URL: ${orgSlug}.${appDomain.split(':')[0]}

Note: This link expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.

If you didn't request this, you can safely ignore this email.

Need help? Contact support@durj.qa

© ${new Date().getFullYear()} Durj. All rights reserved.`,
    });

    logger.info({ email: recipientEmail, organizationId: invitation.organization.id }, 'Resent signup invitation');

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Resend invite error');
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Public endpoint for resending organization signup invitations. Supports both
 * simple resend and email change flows for users who haven't completed setup.
 *
 * SECURITY:
 * [+] Rate limiting (3 attempts per 15 minutes per email/slug)
 * [+] Does not reveal whether email exists (returns success regardless)
 * [+] Validates invitation hasn't expired
 * [+] Checks new email isn't already an organization owner
 * [+] Zod validation on input
 *
 * PATTERNS:
 * [+] Branded HTML email matching organization colors
 * [+] Supports both resend and email change flows
 * [+] Calculates and displays days remaining until expiry
 * [+] Structured logging for debugging
 *
 * POTENTIAL IMPROVEMENTS:
 * [!] In-memory rate limiting won't work with multiple server instances
 *     - Should use Redis or similar distributed store in production
 * [-] Consider adding CAPTCHA for public endpoint abuse prevention
 * [-] Email template could be extracted to a template system
 * [-] Missing email delivery tracking/confirmation
 * [-] Rate limit window doesn't reset properly (attempts.count never resets to 1)
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
