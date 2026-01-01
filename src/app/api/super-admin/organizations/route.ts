/**
 * @file route.ts
 * @description List all organizations and create new organizations with admin invitations
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { validateSlug, isSlugAvailable } from '@/lib/multi-tenant/subdomain';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/core/email';
import { seedDefaultPermissions } from '@/lib/access-control';
import { seedDefaultDocumentTypes } from '@/lib/domains/system/company-documents/document-utils';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string().min(3).max(63),
  adminEmail: z.string().email('Invalid email address'),
  adminName: z.string().optional(),
  // New fields for super-admin tracking
  industry: z.string().optional(),
  companySize: z.string().optional(),
  enabledModules: z.array(z.string()).optional(),
  internalNotes: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations - List all organizations
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { members: true, assets: true },
        },
      },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to get organizations' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/organizations - Create organization and invite admin
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = createOrgSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, slug, adminEmail, adminName, industry, companySize, enabledModules, internalNotes } = result.data;

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
          // New fields
          industry: industry || null,
          companySize: companySize || null,
          internalNotes: internalNotes || null,
          enabledModules: enabledModules || ['assets', 'subscriptions', 'suppliers'],
        },
      });

      // Initialize setup progress tracking for the new organization
      await tx.organizationSetupProgress.create({
        data: { organizationId: org.id },
      });

      // Create invitation for first admin
      await tx.organizationInvitation.create({
        data: {
          organizationId: org.id,
          email: adminEmail.toLowerCase(),
          name: adminName || null,
          role: 'OWNER',
          token: inviteToken,
          expiresAt,
        },
      });

      return org;
    });

    // Seed default permissions for the new organization (non-blocking)
    seedDefaultPermissions(organization.id).catch((err) => {
      console.error('[SuperAdmin] Failed to seed default permissions:', err);
    });

    // Seed default document types for the new organization (non-blocking)
    seedDefaultDocumentTypes(organization.id).catch((err) => {
      console.error('[SuperAdmin] Failed to seed default document types:', err);
    });

    // Build organization-specific invite URL using subdomain
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';
    const protocol = appDomain.includes('localhost') ? 'http' : 'https';
    const inviteUrl = `${protocol}://${slug}.${appDomain}/invite/${inviteToken}`;
    const greeting = adminName ? `Dear ${adminName}` : 'Hello';

    // Send professional invitation email (email-client safe styling)
    const emailResult = await sendEmail({
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
            <td align="center" style="background-color: #2563eb; padding: 40px 40px 30px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">Durj</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">Business Management Platform</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: #ffffff;">
              <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">Welcome to Durj!</h2>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                ${greeting},
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 20px; font-family: Arial, Helvetica, sans-serif;">
                Congratulations! Your organization <strong style="color: #1e293b;">"${name}"</strong> has been created on Durj. You have been designated as the Administrator.
              </p>

              <p style="color: #475569; font-size: 16px; line-height: 24px; margin: 0 0 30px; font-family: Arial, Helvetica, sans-serif;">
                Click the button below to set up your account and start managing your organization:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #2563eb; border-radius: 6px;">
                          <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                            Accept Invitation &amp; Get Started
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

Congratulations! Your organization "${name}" has been created on Durj. You have been designated as the Administrator.

Accept your invitation and get started: ${inviteUrl}

Note: This invitation will expire in 7 days.

If you did not expect this invitation, you can safely ignore this email.

- The Durj Team`,
    });

    return NextResponse.json(
      {
        success: true,
        emailSent: emailResult.success,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        invitation: {
          email: adminEmail,
          inviteUrl,
          expiresAt: expiresAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create organization',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
