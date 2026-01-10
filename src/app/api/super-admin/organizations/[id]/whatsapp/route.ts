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
import { setTenantPlatformWhatsAppAccess, getTenantWhatsAppStatus } from '@/lib/whatsapp/config';
import logger from '@/lib/core/log';

const updateSchema = z.object({
  whatsAppPlatformEnabled: z.boolean().optional(),
  disableCustomConfig: z.boolean().optional(), // Emergency override
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

    // Get message stats for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

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

    return NextResponse.json({
      organization: org,
      whatsApp: {
        ...status,
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

    const { whatsAppPlatformEnabled, disableCustomConfig } = result.data;

    // Update platform access
    if (whatsAppPlatformEnabled !== undefined) {
      await setTenantPlatformWhatsAppAccess(tenantId, whatsAppPlatformEnabled);
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
