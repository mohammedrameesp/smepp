/**
 * @file route.ts
 * @description List super admins and invite/promote new super admins
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { requireRecent2FA } from '@/lib/two-factor';
import { sendEmail } from '@/lib/email';
import logger from '@/lib/core/log';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdmins = await prisma.user.findMany({
      where: { isSuperAdmin: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        twoFactorEnabled: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    return NextResponse.json({ superAdmins });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Get super admins error');
    return NextResponse.json(
      { error: 'Failed to get super admins' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/admins - Invite a new super admin
// ═══════════════════════════════════════════════════════════════════════════════

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().optional(),
});

// Setup token expires in 7 days
const SETUP_TOKEN_EXPIRY_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Require recent 2FA verification for super admin management
    // Creating/promoting super admins is a high-privilege operation
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

    const body = await request.json();
    const { email, name } = inviteSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.isSuperAdmin) {
        return NextResponse.json(
          { error: 'This user is already a super admin' },
          { status: 400 }
        );
      }

      // Promote existing user to super admin
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { isSuperAdmin: true },
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
        },
      });

      // Send notification email to existing user
      await sendSuperAdminPromotionEmail(updatedUser.email, updatedUser.name || email.split('@')[0]);

      return NextResponse.json({
        message: 'User promoted to super admin. Notification email sent.',
        user: updatedUser,
        isNewUser: false,
      });
    }

    // Generate setup token for new user
    const setupToken = crypto.randomBytes(32).toString('hex');
    const setupTokenExpiry = new Date();
    setupTokenExpiry.setDate(setupTokenExpiry.getDate() + SETUP_TOKEN_EXPIRY_DAYS);

    // Create new super admin user with setup token (no password yet)
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        isSuperAdmin: true,
        setupToken,
        setupTokenExpiry,
        // No passwordHash - user will set it via the setup link
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
      },
    });

    // Send welcome email with setup link
    const emailResult = await sendSuperAdminWelcomeEmail(
      newUser.email,
      newUser.name || email.split('@')[0],
      setupToken
    );

    if (!emailResult.success) {
      logger.warn({ email: newUser.email, error: emailResult.error }, 'Failed to send super admin welcome email');
    }

    return NextResponse.json({
      message: emailResult.success
        ? 'Super admin created successfully. Setup email sent.'
        : 'Super admin created but email failed to send. Please share the setup link manually.',
      user: newUser,
      isNewUser: true,
      emailSent: emailResult.success,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Create super admin error');
    return NextResponse.json(
      { error: 'Failed to create super admin' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function sendSuperAdminWelcomeEmail(email: string, name: string, setupToken: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://durj.com';
  const setupUrl = `${baseUrl}/set-password/${setupToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background-color: #0f172a; border-radius: 12px; margin: 0 auto 16px; text-align: center; line-height: 60px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold;">D</span>
              </div>
              <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">Welcome to Durj</h1>
              <p style="color: #64748b; margin: 8px 0 0; font-size: 14px;">Platform Administration</p>
            </div>

            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hi ${name},
            </p>

            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              You've been invited to become a <strong>Super Admin</strong> on the Durj platform. This role grants you full access to manage all organizations, users, and platform settings.
            </p>

            <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>Important:</strong> Super admin privileges provide complete platform access. Please ensure you understand the responsibilities that come with this role.
              </p>
            </div>

            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
              Click the button below to set up your password and activate your account:
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${setupUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; mso-padding-alt: 0;">
                <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt">&nbsp;</i><![endif]-->
                <span style="color: #ffffff;">Set Up Your Password</span>
                <!--[if mso]><i style="mso-font-width:150%">&nbsp;</i><![endif]-->
              </a>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
              This link will expire in ${SETUP_TOKEN_EXPIRY_DAYS} days. If you didn't expect this invitation, please ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${setupUrl}" style="color: #0f172a; word-break: break-all;">${setupUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Welcome to Durj - Platform Administration

Hi ${name},

You've been invited to become a Super Admin on the Durj platform. This role grants you full access to manage all organizations, users, and platform settings.

IMPORTANT: Super admin privileges provide complete platform access. Please ensure you understand the responsibilities that come with this role.

Set up your password here: ${setupUrl}

This link will expire in ${SETUP_TOKEN_EXPIRY_DAYS} days.

If you didn't expect this invitation, please ignore this email.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'You\'ve Been Invited as a Super Admin - Durj',
    html,
    text,
  });
}

async function sendSuperAdminPromotionEmail(email: string, name: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://durj.com';
  const loginUrl = `${baseUrl}/super-admin`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
          <td style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="width: 60px; height: 60px; background-color: #0f172a; border-radius: 12px; margin: 0 auto 16px; text-align: center; line-height: 60px;">
                <span style="color: #ffffff; font-size: 24px; font-weight: bold;">D</span>
              </div>
              <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 700;">Super Admin Access Granted</h1>
            </div>

            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Hi ${name},
            </p>

            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
              Your account has been promoted to <strong>Super Admin</strong> on the Durj platform. You now have full access to manage all organizations, users, and platform settings.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${loginUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; mso-padding-alt: 0;">
                <!--[if mso]><i style="mso-font-width:150%;mso-text-raise:22pt">&nbsp;</i><![endif]-->
                <span style="color: #ffffff;">Access Super Admin Dashboard</span>
                <!--[if mso]><i style="mso-font-width:150%">&nbsp;</i><![endif]-->
              </a>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
              Use your existing login credentials to access the super admin dashboard.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Super Admin Access Granted - Durj

Hi ${name},

Your account has been promoted to Super Admin on the Durj platform. You now have full access to manage all organizations, users, and platform settings.

Access the super admin dashboard: ${loginUrl}

Use your existing login credentials to access the super admin dashboard.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Super Admin Access Granted - Durj',
    html,
    text,
  });
}
