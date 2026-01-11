import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { z } from 'zod';
import { validateSlug, isSlugAvailable } from '@/lib/multi-tenant/subdomain';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/core/email';
import { newOrganizationSignupEmail } from '@/lib/core/email-templates';
import { seedDefaultPermissions } from '@/lib/access-control';
import { seedDefaultLeaveTypes } from '@/features/leave/lib/seed-leave-types';
import { seedDefaultAssetCategories } from '@/features/assets';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(3).max(63),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  enabledModules: z.array(z.string()).optional(),
  isEmployee: z.boolean().optional(), // true = employee (requires HR profile), false = system/service account
  isOnWps: z.boolean().optional(), // Only relevant if isEmployee = true
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/organizations/signup - Public organization signup
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug, adminEmail, adminName, industry, companySize, enabledModules, isEmployee, isOnWps } = result.data;

    // Validate slug
    const slugValidation = validateSlug(slug);
    if (!slugValidation.valid) {
      return NextResponse.json({ error: slugValidation.error }, { status: 400 });
    }

    // Check availability
    const available = await isSlugAvailable(slug);
    if (!available) {
      return NextResponse.json(
        { error: 'This subdomain is already taken' },
        { status: 409 }
      );
    }

    // Check if email is already used as an owner
    const existingOwner = await prisma.teamMember.findFirst({
      where: {
        email: adminEmail.toLowerCase(),
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

    // Generate invitation token
    const inviteToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create organization and invitation in transaction
    const organization = await prisma.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name,
          slug: slug.toLowerCase(),
          subscriptionTier: 'FREE',
          maxUsers: 5,
          maxAssets: 50,
          industry: industry || null,
          companySize: companySize || null,
          enabledModules: enabledModules || ['assets', 'subscriptions', 'suppliers'],
        },
      });

      // Initialize setup progress tracking for the new organization
      // profileComplete is true since name is provided during signup
      await tx.organizationSetupProgress.create({
        data: {
          organizationId: org.id,
          profileComplete: true,
        },
      });

      // Create invitation for first admin
      // Default to employee if not specified
      const finalIsEmployee = isEmployee ?? true;
      const finalIsOnWps = finalIsEmployee ? (isOnWps ?? false) : false;

      await tx.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: adminEmail.toLowerCase(),
          name: adminName || null,
          role: 'OWNER',
          token: inviteToken,
          expiresAt,
          isEmployee: finalIsEmployee,
          isOnWps: finalIsOnWps,
        },
      });

      return org;
    });

    // Seed default permissions for the new organization (non-blocking)
    seedDefaultPermissions(organization.id).catch((err: Error) => {
      logger.error({ error: err.message, organizationId: organization.id }, 'Failed to seed default permissions');
    });

    // Seed default leave types for the new organization (non-blocking)
    seedDefaultLeaveTypes(organization.id).catch((err: Error) => {
      logger.error({ error: err.message, organizationId: organization.id }, 'Failed to seed default leave types');
    });

    // Seed default asset categories for the new organization (non-blocking)
    seedDefaultAssetCategories(organization.id).catch((err: Error) => {
      logger.error({ error: err.message, organizationId: organization.id }, 'Failed to seed default asset categories');
    });

    // Build organization-specific invite URL using subdomain
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${slug}.${appDomain}/invite/${inviteToken}`;
    const greeting = adminName ? `Dear ${adminName}` : 'Hello';

    // Send welcome email
    await sendEmail({
      to: adminEmail,
      subject: `Welcome to Durj - Your Organization "${name}" is Ready`,
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
            <td align="center" style="background-color: #0f172a; padding: 40px 40px 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">${name}</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Welcome to Your New Workspace</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">You're Almost There!</h2>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                ${greeting},
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                Thank you for choosing Durj! Your organization <strong style="color: #1e293b;">"${name}"</strong> has been created and is ready for you.
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 30px; font-family: Arial, Helvetica, sans-serif;">
                Click the button below to set up your password and access your dashboard:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #0f172a; border-radius: 6px;">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                            Complete Your Setup
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Organization Info -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif;">Your Portal URL</p>
                    <p style="color: #0f172a; font-size: 16px; font-weight: bold; margin: 0; font-family: monospace;">${slug}.${(process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000').split(':')[0]}</p>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="color: #64748b; font-size: 14px; line-height: 21px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                Or copy and paste this link:<br/>
                <a href="${inviteUrl}" style="color: #0f172a; word-break: break-all;">${inviteUrl}</a>
              </p>

              <!-- Expiry Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px;">
                    <p style="color: #92400e; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                      <strong>Note:</strong> This link expires in 7 days.
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
                If you didn't create this organization, you can safely ignore this email.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0; font-family: Arial, Helvetica, sans-serif;">
                © ${new Date().getFullYear()} ${name}. Powered by Durj.
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

Thank you for choosing Durj! Your organization "${name}" has been created and is ready for you.

Complete your setup here: ${inviteUrl}

Your portal URL: ${slug}.${(process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000').split(':')[0]}

Note: This link expires in 7 days.

If you didn't create this organization, you can safely ignore this email.

- The ${name} Team`,
    });

    // Send notification to super admin (non-blocking)
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (superAdminEmail) {
      const superAdminNotification = newOrganizationSignupEmail({
        organizationName: name,
        organizationSlug: slug,
        adminEmail,
        adminName,
        industry,
        companySize,
        signupDate: new Date(),
        primaryColor: undefined, // New org doesn't have custom color yet
      });

      // Fire and forget - don't block the response
      sendEmail({
        to: superAdminEmail,
        subject: superAdminNotification.subject,
        html: superAdminNotification.html,
        text: superAdminNotification.text,
      }).catch((err) => {
        logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Failed to send super admin notification');
      });
    }

    return NextResponse.json(
      {
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Signup error');
    return NextResponse.json(
      {
        error: 'Failed to create organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
