import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { sendEmail } from '@/lib/core/email';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password - Request password reset
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Find user with password (credential users only)
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        passwordHash: { not: null }, // Only credential users can reset password
      },
      include: {
        organizationMemberships: {
          include: {
            organization: {
              select: { slug: true },
            },
          },
          take: 1,
        },
      },
    });

    // Always return success to prevent email enumeration
    // But only send reset link if user exists
    if (user) {
      // Generate secure token
      const resetToken = randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry,
        },
      });

      // Build reset URL - use org subdomain if user has one, otherwise main domain
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
      const protocol = appDomain.includes('localhost') ? 'http' : 'https';
      const orgSlug = user.organizationMemberships[0]?.organization?.slug;
      const resetUrl = orgSlug
        ? `${protocol}://${orgSlug}.${appDomain}/reset-password/${resetToken}`
        : `${protocol}://${appDomain}/reset-password/${resetToken}`;

      // Send password reset email
      await sendEmail({
        to: user.email,
        subject: 'Reset your SME++ password',
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
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">SME++</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Business Management Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">Reset Your Password</h2>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                Hello${user.name ? ` ${user.name}` : ''},
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #2563eb; border-radius: 6px;">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                            Reset Password
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
                <a href="${resetUrl}" style="color: #2563eb; word-break: break-all;">${resetUrl}</a>
              </p>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                      <strong>Note:</strong> This link will expire in 1 hour for security reasons.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #475569; font-size: 14px; line-height: 21px; margin: 20px 0 0; font-family: Arial, Helvetica, sans-serif;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; line-height: 21px; margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif;">
                This is an automated message from SME++.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                © ${new Date().getFullYear()} SME++. All rights reserved.
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
        text: `Hello${user.name ? ` ${user.name}` : ''},

We received a request to reset your password for SME++.

Reset your password: ${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

- The SME++ Team`,
      });

      console.log(`[Password Reset] Email sent to ${user.email}`);
    }

    // Always return success (security: don't reveal if email exists)
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
