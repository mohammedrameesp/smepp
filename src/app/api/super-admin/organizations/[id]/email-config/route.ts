/**
 * @file route.ts
 * @description Manage organization email configuration (custom SMTP for white-label emails)
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import logger from '@/lib/core/log';
import { encrypt, decrypt } from '@/lib/oauth/utils';

const emailConfigSchema = z.object({
  customSmtpHost: z.string().nullable().optional(),
  customSmtpPort: z.number().min(1).max(65535).nullable().optional(),
  customSmtpUser: z.string().nullable().optional(),
  customSmtpPassword: z.string().nullable().optional(),
  customSmtpSecure: z.boolean().optional(),
  customEmailFrom: z.string().email('Invalid email format').nullable().optional(),
  customEmailName: z.string().nullable().optional(),
}).refine(
  (data) => {
    // If any SMTP field is provided (non-null), require host, port, user, and from
    const hasAnyConfig = data.customSmtpHost || data.customSmtpPort ||
                         data.customSmtpUser || data.customEmailFrom;

    if (hasAnyConfig) {
      // When configuring, host, port, user, and from are required
      const hasRequired = data.customSmtpHost && data.customSmtpPort &&
                          data.customSmtpUser && data.customEmailFrom;
      return hasRequired;
    }
    return true;
  },
  { message: 'SMTP Host, Port, User, and From Email are required when configuring custom email' }
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations/[id]/email-config
// Get organization email configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        customSmtpHost: true,
        customSmtpPort: true,
        customSmtpUser: true,
        customSmtpPassword: true,
        customSmtpSecure: true,
        customEmailFrom: true,
        customEmailName: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Return config without actual password - just indicate if it's set
    return NextResponse.json({
      emailConfig: {
        customSmtpHost: organization.customSmtpHost,
        customSmtpPort: organization.customSmtpPort,
        customSmtpUser: organization.customSmtpUser,
        customSmtpSecure: organization.customSmtpSecure,
        customEmailFrom: organization.customEmailFrom,
        customEmailName: organization.customEmailName,
        // Indicate if password is configured (don't expose actual value)
        hasSmtpPassword: !!organization.customSmtpPassword,
        // Indicate if full config is complete
        isConfigured: !!(
          organization.customSmtpHost &&
          organization.customSmtpPort &&
          organization.customSmtpUser &&
          organization.customSmtpPassword &&
          organization.customEmailFrom
        ),
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Get email config error');
    return NextResponse.json(
      { error: 'Failed to get email configuration' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/super-admin/organizations/[id]/email-config
// Update organization email configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const result = emailConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const {
      customSmtpHost,
      customSmtpPort,
      customSmtpUser,
      customSmtpPassword,
      customSmtpSecure,
      customEmailFrom,
      customEmailName,
    } = result.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (customSmtpHost !== undefined) {
      updateData.customSmtpHost = customSmtpHost || null;
    }

    if (customSmtpPort !== undefined) {
      updateData.customSmtpPort = customSmtpPort || null;
    }

    if (customSmtpUser !== undefined) {
      updateData.customSmtpUser = customSmtpUser || null;
    }

    if (customSmtpPassword !== undefined) {
      // Encrypt the password before storing
      updateData.customSmtpPassword = customSmtpPassword
        ? encrypt(customSmtpPassword)
        : null;
    }

    if (customSmtpSecure !== undefined) {
      updateData.customSmtpSecure = customSmtpSecure;
    }

    if (customEmailFrom !== undefined) {
      updateData.customEmailFrom = customEmailFrom || null;
    }

    if (customEmailName !== undefined) {
      updateData.customEmailName = customEmailName || null;
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        customSmtpHost: true,
        customSmtpPort: true,
        customSmtpUser: true,
        customSmtpSecure: true,
        customEmailFrom: true,
        customEmailName: true,
        customSmtpPassword: true,
      },
    });

    return NextResponse.json({
      success: true,
      emailConfig: {
        customSmtpHost: organization.customSmtpHost,
        customSmtpPort: organization.customSmtpPort,
        customSmtpUser: organization.customSmtpUser,
        customSmtpSecure: organization.customSmtpSecure,
        customEmailFrom: organization.customEmailFrom,
        customEmailName: organization.customEmailName,
        hasSmtpPassword: !!organization.customSmtpPassword,
        isConfigured: !!(
          organization.customSmtpHost &&
          organization.customSmtpPort &&
          organization.customSmtpUser &&
          organization.customSmtpPassword &&
          organization.customEmailFrom
        ),
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Update email config error');
    return NextResponse.json(
      { error: 'Failed to update email configuration' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/organizations/[id]/email-config
// Test email configuration by sending a test email
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
    const body = await request.json();
    const testEmail = body.testEmail;

    if (!testEmail || !z.string().email().safeParse(testEmail).success) {
      return NextResponse.json(
        { error: 'Valid test email address is required' },
        { status: 400 }
      );
    }

    // Get organization email config
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        name: true,
        customSmtpHost: true,
        customSmtpPort: true,
        customSmtpUser: true,
        customSmtpPassword: true,
        customSmtpSecure: true,
        customEmailFrom: true,
        customEmailName: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!organization.customSmtpHost || !organization.customSmtpPort ||
        !organization.customSmtpUser || !organization.customSmtpPassword ||
        !organization.customEmailFrom) {
      return NextResponse.json(
        { error: 'Email configuration is incomplete' },
        { status: 400 }
      );
    }

    // Decrypt password
    const smtpPassword = decrypt(organization.customSmtpPassword);
    if (!smtpPassword) {
      return NextResponse.json(
        { error: 'Failed to decrypt SMTP password' },
        { status: 500 }
      );
    }

    // Dynamic import to avoid Edge Runtime bundling issues
    const nodemailer = await import('nodemailer');

    // Create transporter and send test email
    const transporter = nodemailer.createTransport({
      host: organization.customSmtpHost,
      port: organization.customSmtpPort,
      secure: organization.customSmtpSecure,
      auth: {
        user: organization.customSmtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: organization.customEmailName
        ? `"${organization.customEmailName}" <${organization.customEmailFrom}>`
        : organization.customEmailFrom,
      to: testEmail,
      subject: `Test Email from ${organization.name}`,
      text: `This is a test email to verify your custom SMTP configuration for ${organization.name}.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email to verify your custom SMTP configuration for <strong>${organization.name}</strong>.</p>
          <p>If you received this email, your custom email configuration is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px;">
            Sent from: ${organization.customEmailFrom}<br />
            SMTP Host: ${organization.customSmtpHost}
          </p>
        </div>
      `,
    });

    logger.info({ orgId: id, testEmail }, 'Test email sent successfully');

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Test email failed');
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/organizations/[id]/email-config
// Clear organization email configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if organization exists
    const existing = await prisma.organization.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Clear all email config
    await prisma.organization.update({
      where: { id },
      data: {
        customSmtpHost: null,
        customSmtpPort: null,
        customSmtpUser: null,
        customSmtpPassword: null,
        customSmtpSecure: true,
        customEmailFrom: null,
        customEmailName: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email configuration cleared',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Delete email config error');
    return NextResponse.json(
      { error: 'Failed to clear email configuration' },
      { status: 500 }
    );
  }
}
