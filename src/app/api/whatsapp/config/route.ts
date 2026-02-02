/**
 * @module api/whatsapp/config
 *
 * WhatsApp Configuration API
 *
 * CRUD endpoints for managing WhatsApp Business API configuration.
 * Supports hybrid mode: tenants can use platform WhatsApp or their own.
 * Admin only - requires ADMIN or OWNER role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import {
  saveWhatsAppConfig,
  disableWhatsApp,
  WhatsAppClient,
  updateTenantWhatsAppSource,
} from '@/lib/whatsapp';
import { clearAllWhatsAppPromptSnoozes } from '@/lib/utils/whatsapp-verification-check';

// Validation schema for config input
const configSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  businessAccountId: z.string().min(1, 'Business Account ID is required'),
  accessToken: z.string().min(1, 'Access Token is required'),
});

// Validation schema for source update
const sourceSchema = z.object({
  source: z.enum(['NONE', 'PLATFORM', 'CUSTOM']),
});

/**
 * GET /api/whatsapp/config
 *
 * Get the current WhatsApp configuration status for the tenant.
 * Returns both source preference and platform/custom config details.
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Get tenant's organization settings and custom config
  const [org, platformConfig] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenant.tenantId },
      select: {
        whatsAppSource: true,
        whatsAppPlatformEnabled: true,
        whatsAppConfig: {
          select: {
            id: true,
            phoneNumberId: true,
            businessAccountId: true,
            webhookVerifyToken: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.platformWhatsAppConfig.findFirst({
      where: { isActive: true },
      select: {
        displayPhoneNumber: true,
        businessName: true,
      },
    }),
  ]);

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Get webhook URL for display
  const baseUrl = process.env.NEXTAUTH_URL || 'https://your-domain.com';
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`;

  // Platform is available if:
  // 1. Super admin has enabled platform access for this tenant (whatsAppPlatformEnabled)
  // 2. Platform config exists and is active
  const platformAvailable = org.whatsAppPlatformEnabled && !!platformConfig;

  return NextResponse.json({
    // Source preference
    source: org.whatsAppSource,

    // Platform info
    platformAvailable,
    platformDisplayPhone: platformConfig?.displayPhoneNumber || null,
    platformBusinessName: platformConfig?.businessName || null,

    // Custom config
    customConfigured: !!org.whatsAppConfig,
    customConfig: org.whatsAppConfig ? {
      ...org.whatsAppConfig,
      accessToken: '••••••••', // Never expose the actual token
    } : null,

    webhookUrl,
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * POST /api/whatsapp/config
 *
 * Save or update custom WhatsApp configuration.
 * Validates the credentials by testing the connection.
 * Automatically sets source to CUSTOM.
 */
export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const validatedInput = configSchema.parse(body);

  // Test the connection before saving
  const testConfig = {
    phoneNumberId: validatedInput.phoneNumberId,
    businessAccountId: validatedInput.businessAccountId,
    accessToken: validatedInput.accessToken,
    webhookVerifyToken: '', // Not needed for test
    isActive: true,
  };

  const client = new WhatsAppClient(testConfig);
  const isValid = await client.testConnection();

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid credentials - connection test failed' },
      { status: 400 }
    );
  }

  // Save the configuration and set source to CUSTOM
  await Promise.all([
    saveWhatsAppConfig(tenant.tenantId, validatedInput),
    updateTenantWhatsAppSource(tenant.tenantId, 'CUSTOM'),
  ]);

  // Get the saved config to return
  const savedConfig = await prisma.whatsAppConfig.findUnique({
    where: { tenantId: tenant.tenantId },
    select: {
      id: true,
      phoneNumberId: true,
      businessAccountId: true,
      webhookVerifyToken: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://your-domain.com';
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`;

  return NextResponse.json({
    success: true,
    message: 'WhatsApp configuration saved successfully',
    source: 'CUSTOM',
    customConfig: {
      ...savedConfig,
      accessToken: '••••••••',
    },
    webhookUrl,
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * DELETE /api/whatsapp/config
 *
 * Disable custom WhatsApp configuration for the tenant.
 * Note: This only disables the custom config, not the source selection.
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await disableWhatsApp(tenant.tenantId);

  return NextResponse.json({
    success: true,
    message: 'Custom WhatsApp configuration disabled',
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * PATCH /api/whatsapp/config
 *
 * Update WhatsApp source preference (NONE, PLATFORM, CUSTOM).
 * Used to switch between platform WhatsApp, custom config, or disabled.
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const result = sourceSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid source', details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { source } = result.data;

  // Validate the source can be selected
  const [org, platformConfig] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenant.tenantId },
      select: {
        whatsAppSource: true,
        whatsAppPlatformEnabled: true,
        whatsAppConfig: { select: { isActive: true } },
      },
    }),
    prisma.platformWhatsAppConfig.findFirst({
      where: { isActive: true },
      select: { id: true },
    }),
  ]);

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Validate PLATFORM selection
  if (source === 'PLATFORM') {
    if (!org.whatsAppPlatformEnabled) {
      return NextResponse.json(
        { error: 'Platform WhatsApp is not enabled for your organization. Contact your administrator.' },
        { status: 400 }
      );
    }
    if (!platformConfig) {
      return NextResponse.json(
        { error: 'Platform WhatsApp is not configured yet.' },
        { status: 400 }
      );
    }
  }

  // Validate CUSTOM selection
  if (source === 'CUSTOM' && !org.whatsAppConfig?.isActive) {
    return NextResponse.json(
      { error: 'You must configure your custom WhatsApp credentials first.' },
      { status: 400 }
    );
  }

  // Check if this is first time enabling WhatsApp (transitioning from NONE)
  const wasDisabled = org.whatsAppSource === 'NONE';
  const isEnabling = source !== 'NONE';

  // Update the source
  await updateTenantWhatsAppSource(tenant.tenantId, source);

  // If enabling WhatsApp for the first time, clear snoozes for all eligible users
  // so they'll see the verification prompt on their next login
  let eligibleUsersNotified = 0;
  if (wasDisabled && isEnabling) {
    eligibleUsersNotified = await clearAllWhatsAppPromptSnoozes(tenant.tenantId);
  }

  return NextResponse.json({
    success: true,
    message: `WhatsApp source updated to ${source}`,
    source,
    ...(eligibleUsersNotified > 0 && {
      notification: `${eligibleUsersNotified} eligible users will be prompted to verify their WhatsApp number.`,
    }),
  });
}, { requireAuth: true, requireAdmin: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - No changes needed - file is well-structured
 *   - Has proper JSDoc module documentation
 *   - Uses Zod validation for input
 *   - Has proper tenant isolation (tenantId checks in all handlers)
 *   - Uses withErrorHandler with requireAuth and requireAdmin
 *   - Access tokens are masked in responses (security)
 *   - Tests WhatsApp connection before saving config
 * Issues: None
 */
