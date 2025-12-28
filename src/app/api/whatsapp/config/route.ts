/**
 * WhatsApp Configuration API
 *
 * CRUD endpoints for managing WhatsApp Business API configuration.
 * Admin only - requires ADMIN or OWNER role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler } from '@/lib/http/handler';
import { prisma } from '@/lib/core/prisma';
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  disableWhatsApp,
  WhatsAppClient,
  decrypt,
} from '@/lib/whatsapp';

// Validation schema for config input
const configSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  businessAccountId: z.string().min(1, 'Business Account ID is required'),
  accessToken: z.string().min(1, 'Access Token is required'),
});

/**
 * GET /api/whatsapp/config
 *
 * Get the current WhatsApp configuration for the tenant.
 * Returns masked access token for security.
 */
export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const config = await prisma.whatsAppConfig.findUnique({
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

  if (!config) {
    return NextResponse.json({ configured: false });
  }

  // Get webhook URL for display
  const baseUrl = process.env.NEXTAUTH_URL || 'https://your-domain.com';
  const webhookUrl = `${baseUrl}/api/webhooks/whatsapp`;

  return NextResponse.json({
    configured: true,
    config: {
      ...config,
      accessToken: '••••••••', // Never expose the actual token
    },
    webhookUrl,
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * POST /api/whatsapp/config
 *
 * Save or update WhatsApp configuration.
 * Validates the credentials by testing the connection.
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

  // Save the configuration
  await saveWhatsAppConfig(tenant.tenantId, validatedInput);

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
    config: {
      ...savedConfig,
      accessToken: '••••••••',
    },
    webhookUrl,
  });
}, { requireAuth: true, requireAdmin: true });

/**
 * DELETE /api/whatsapp/config
 *
 * Disable WhatsApp integration for the tenant.
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { tenant }) => {
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await disableWhatsApp(tenant.tenantId);

  return NextResponse.json({
    success: true,
    message: 'WhatsApp integration disabled',
  });
}, { requireAuth: true, requireAdmin: true });
