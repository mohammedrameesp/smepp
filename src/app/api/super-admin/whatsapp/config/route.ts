/**
 * @file route.ts
 * @description Platform-level WhatsApp Business API configuration management
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { z } from 'zod';
import logger from '@/lib/core/log';
import {
  savePlatformWhatsAppConfig,
  disablePlatformWhatsApp,
  getPlatformWhatsAppConfigForDisplay,
} from '@/lib/whatsapp/config';
import { WhatsAppClient } from '@/lib/whatsapp/client';

const platformConfigSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
  businessAccountId: z.string().min(1, 'Business Account ID is required'),
  accessToken: z.string().min(1, 'Access Token is required'),
  displayPhoneNumber: z.string().optional(),
  businessName: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/whatsapp/config
// Get platform WhatsApp configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await getPlatformWhatsAppConfigForDisplay();
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'https://durj.com'}/api/webhooks/whatsapp`;

    return NextResponse.json({
      ...result,
      webhookUrl,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Get platform WhatsApp config error');
    return NextResponse.json(
      { error: 'Failed to get platform WhatsApp configuration' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/super-admin/whatsapp/config
// Save platform WhatsApp configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const result = platformConfigSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { phoneNumberId, businessAccountId, accessToken, displayPhoneNumber, businessName } =
      result.data;

    // Test connection before saving
    const testClient = new WhatsAppClient({
      phoneNumberId,
      businessAccountId,
      accessToken,
      webhookVerifyToken: '',
      isActive: true,
    });

    const isConnected = await testClient.testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Failed to connect to WhatsApp API. Please check your credentials.' },
        { status: 400 }
      );
    }

    // Save configuration
    await savePlatformWhatsAppConfig({
      phoneNumberId,
      businessAccountId,
      accessToken,
      displayPhoneNumber,
      businessName,
    });

    const updated = await getPlatformWhatsAppConfigForDisplay();
    const webhookUrl = `${process.env.NEXTAUTH_URL || 'https://durj.com'}/api/webhooks/whatsapp`;

    return NextResponse.json({
      success: true,
      message: 'Platform WhatsApp configuration saved successfully',
      ...updated,
      webhookUrl,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Save platform WhatsApp config error');
    return NextResponse.json(
      { error: 'Failed to save platform WhatsApp configuration' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/super-admin/whatsapp/config
// Disable platform WhatsApp configuration
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await disablePlatformWhatsApp();

    return NextResponse.json({
      success: true,
      message: 'Platform WhatsApp configuration disabled',
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Disable platform WhatsApp error');
    return NextResponse.json(
      { error: 'Failed to disable platform WhatsApp configuration' },
      { status: 500 }
    );
  }
}
