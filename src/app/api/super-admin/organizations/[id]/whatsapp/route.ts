/**
 * @file route.ts
 * @description Manage tenant WhatsApp configuration and usage statistics
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { setTenantPlatformWhatsAppAccess, getTenantWhatsAppStatus, encrypt } from '@/lib/whatsapp/config';
import logger from '@/lib/core/log';
import { getQatarStartOfDay } from '@/lib/core/datetime';

const updateSchema = z.object({
  // Source selection
  source: z.enum(['NONE', 'PLATFORM', 'CUSTOM']).optional(),
  // Platform access control
  whatsAppPlatformEnabled: z.boolean().optional(),
  // Custom configuration
  customConfig: z.object({
    phoneNumberId: z.string().min(1),
    businessAccountId: z.string().min(1),
    accessToken: z.string().min(1),
  }).optional(),
  // Emergency override
  disableCustomConfig: z.boolean().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/organizations/[id]/whatsapp
// Get tenant's WhatsApp status and usage stats
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

    const { id: tenantId } = await params;

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get WhatsApp status
    const status = await getTenantWhatsAppStatus(tenantId);

    // Get custom config details (for display, not the token)
    const customConfig = await prisma.whatsAppConfig.findFirst({
      where: { tenantId },
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

    // Get message stats for current month
    const startOfMonth = getQatarStartOfDay();
    startOfMonth.setDate(1);

    const [messagesSent, messagesDelivered, messagesFailed, recentLogs] = await Promise.all([
      prisma.whatsAppMessageLog.count({
        where: { tenantId, createdAt: { gte: startOfMonth }, status: 'sent' },
      }),
      prisma.whatsAppMessageLog.count({
        where: { tenantId, createdAt: { gte: startOfMonth }, status: 'delivered' },
      }),
      prisma.whatsAppMessageLog.count({
        where: { tenantId, createdAt: { gte: startOfMonth }, status: 'failed' },
      }),
      prisma.whatsAppMessageLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          recipientPhone: true,
          templateName: true,
          status: true,
          configSource: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
    ]);

    // Build webhook URL for custom config
    const baseUrl = process.env.NEXTAUTH_URL || 'https://app.durj.com';
    const webhookUrl = `${baseUrl}/api/whatsapp/webhook/${tenantId}`;

    return NextResponse.json({
      organization: org,
      whatsApp: {
        ...status,
        customConfig: customConfig ? {
          ...customConfig,
          webhookUrl,
        } : null,
        stats: {
          messagesSentThisMonth: messagesSent,
          messagesDelivered,
          messagesFailed,
        },
        recentLogs: recentLogs.map((log) => ({
          ...log,
          recipientPhone: maskPhoneNumber(log.recipientPhone),
        })),
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Get tenant WhatsApp status error');
    return NextResponse.json(
      { error: 'Failed to get WhatsApp status' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/super-admin/organizations/[id]/whatsapp
// Update tenant's WhatsApp settings (super admin controls)
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

    const { id: tenantId } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify organization exists
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { source, whatsAppPlatformEnabled, customConfig, disableCustomConfig } = result.data;

    // Handle source change
    if (source !== undefined) {
      // Update organization's whatsAppSource
      await prisma.organization.update({
        where: { id: tenantId },
        data: { whatsAppSource: source },
      });

      // If switching to PLATFORM, enable platform access
      if (source === 'PLATFORM') {
        await setTenantPlatformWhatsAppAccess(tenantId, true);
      }

      // If switching to NONE, disable everything
      if (source === 'NONE') {
        await setTenantPlatformWhatsAppAccess(tenantId, false);
        await prisma.whatsAppConfig.updateMany({
          where: { tenantId },
          data: { isActive: false },
        });
      }

      // If switching to CUSTOM, activate custom config if exists
      if (source === 'CUSTOM') {
        await prisma.whatsAppConfig.updateMany({
          where: { tenantId },
          data: { isActive: true },
        });
      }
    }

    // Update platform access directly
    if (whatsAppPlatformEnabled !== undefined) {
      await setTenantPlatformWhatsAppAccess(tenantId, whatsAppPlatformEnabled);
    }

    // Save custom configuration
    if (customConfig) {
      const { phoneNumberId, businessAccountId, accessToken } = customConfig;

      // Encrypt the access token
      const accessTokenEncrypted = encrypt(accessToken);

      // Check if config exists
      const existingConfig = await prisma.whatsAppConfig.findFirst({
        where: { tenantId },
      });

      if (existingConfig) {
        // Update existing config
        await prisma.whatsAppConfig.update({
          where: { id: existingConfig.id },
          data: {
            phoneNumberId,
            businessAccountId,
            accessTokenEncrypted,
            isActive: true,
          },
        });
      } else {
        // Create new config with webhook verify token
        const crypto = await import('crypto');
        const webhookVerifyToken = crypto.randomBytes(32).toString('hex');

        await prisma.whatsAppConfig.create({
          data: {
            tenantId,
            phoneNumberId,
            businessAccountId,
            accessTokenEncrypted,
            webhookVerifyToken,
            isActive: true,
          },
        });
      }

      // Set source to CUSTOM
      await prisma.organization.update({
        where: { id: tenantId },
        data: { whatsAppSource: 'CUSTOM' },
      });
    }

    // Emergency: Disable custom config
    if (disableCustomConfig) {
      await prisma.whatsAppConfig.updateMany({
        where: { tenantId },
        data: { isActive: false },
      });
    }

    // Get updated status
    const status = await getTenantWhatsAppStatus(tenantId);

    return NextResponse.json({
      success: true,
      organization: org,
      whatsApp: status,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Update tenant WhatsApp settings error');
    return NextResponse.json(
      { error: 'Failed to update WhatsApp settings' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function maskPhoneNumber(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}
