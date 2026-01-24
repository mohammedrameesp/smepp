/**
 * @file route.ts
 * @description WhatsApp verification prompt API - allows eligible users to verify
 *              their WhatsApp number when the organization has WhatsApp enabled
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { invalidBodyResponse } from '@/lib/http/responses';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { prisma } from '@/lib/core/prisma';
import { logAction, ActivityActions } from '@/lib/core/activity';
import {
  checkWhatsAppVerificationNeeded,
  snoozeWhatsAppPrompt,
} from '@/lib/utils/whatsapp-verification-check';
import {
  saveMemberWhatsAppPhone,
  verifyMemberWhatsAppPhone,
  getEffectiveWhatsAppConfig,
  WhatsAppClient,
} from '@/lib/whatsapp';

const phoneSchema = z.object({
  phoneNumber: z.string().min(8, 'Phone number must be at least 8 digits'),
  countryCode: z.string().regex(/^\+\d{1,4}$/, 'Invalid country code').default('+974'),
});

const snoozeSchema = z.object({
  days: z.number().min(1).max(30).default(3),
});

// GET /api/users/me/whatsapp-verification - Check if verification is needed
async function getVerificationStatusHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;

  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const result = await checkWhatsAppVerificationNeeded(tenant.tenantId, tenant.userId);

  return NextResponse.json(result);
}

export const GET = withErrorHandler(getVerificationStatusHandler, { requireAuth: true });

// POST /api/users/me/whatsapp-verification - Submit phone for verification
async function submitPhoneHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;

  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const validation = phoneSchema.safeParse(body);

  if (!validation.success) {
    return invalidBodyResponse(validation.error);
  }

  const { phoneNumber, countryCode } = validation.data;
  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

  // Save the phone number (marks as unverified)
  await saveMemberWhatsAppPhone(tenant.tenantId, tenant.userId, fullPhoneNumber);

  // Try to send a verification message
  let messageSent = false;
  let messageError: string | null = null;

  try {
    const config = await getEffectiveWhatsAppConfig(tenant.tenantId);
    if (config) {
      const client = new WhatsAppClient(config.config);
      await client.sendTextMessage(
        fullPhoneNumber,
        '✅ Your WhatsApp number has been verified for receiving notifications from your organization.\n\nYou will now receive important alerts for approvals, leave requests, and other updates.'
      );
      messageSent = true;

      // Auto-verify if message was sent successfully
      await verifyMemberWhatsAppPhone(tenant.userId);

      // Clear any snooze
      await prisma.teamMember.update({
        where: { id: tenant.userId },
        data: { whatsAppPromptSnoozedUntil: null },
      });
    }
  } catch (error) {
    messageError = error instanceof Error ? error.message : 'Failed to send verification message';
    console.error('WhatsApp verification message failed:', error);
  }

  // Log the action
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.USER_UPDATED,
    'WhatsAppUserPhone',
    tenant.userId,
    {
      action: 'phone_submitted',
      phoneNumber: fullPhoneNumber.replace(/(\+\d{3})\d+(\d{4})/, '$1****$2'), // Mask middle digits
      verified: messageSent,
    }
  );

  if (messageSent) {
    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Phone number verified! You will now receive WhatsApp notifications.',
    });
  } else {
    return NextResponse.json({
      success: true,
      verified: false,
      message: 'Phone number saved. Verification pending.',
      error: messageError,
    });
  }
}

export const POST = withErrorHandler(submitPhoneHandler, { requireAuth: true });

// PATCH /api/users/me/whatsapp-verification - Admin verify (or re-verify)
async function verifyPhoneHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Check if user has a phone to verify
  const whatsAppPhone = await prisma.whatsAppUserPhone.findUnique({
    where: { memberId: tenant.userId },
  });

  if (!whatsAppPhone) {
    return NextResponse.json(
      { error: 'No phone number registered. Please submit a phone number first.' },
      { status: 400 }
    );
  }

  if (whatsAppPhone.isVerified) {
    return NextResponse.json({
      success: true,
      message: 'Phone number is already verified.',
    });
  }

  // Try to send verification message again
  try {
    const config = await getEffectiveWhatsAppConfig(tenant.tenantId);
    if (config) {
      const client = new WhatsAppClient(config.config);
      await client.sendTextMessage(
        whatsAppPhone.phoneNumber,
        '✅ Your WhatsApp number has been verified for receiving notifications from your organization.\n\nYou will now receive important alerts for approvals, leave requests, and other updates.'
      );

      // Mark as verified
      await verifyMemberWhatsAppPhone(tenant.userId);

      // Clear any snooze
      await prisma.teamMember.update({
        where: { id: tenant.userId },
        data: { whatsAppPromptSnoozedUntil: null },
      });

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Phone number verified successfully!',
      });
    } else {
      return NextResponse.json(
        { error: 'WhatsApp is not configured for this organization' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to verify phone number',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const PATCH = withErrorHandler(verifyPhoneHandler, { requireAuth: true });

// DELETE /api/users/me/whatsapp-verification - Snooze the prompt
async function snoozePromptHandler(request: NextRequest, context: APIContext) {
  const { tenant } = context;

  if (!tenant?.tenantId || !tenant.userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let days = 3;

  // Try to parse body if present
  try {
    const body = await request.json();
    const validation = snoozeSchema.safeParse(body);
    if (validation.success) {
      days = validation.data.days;
    }
  } catch {
    // Use default days if no body
  }

  const snoozedUntil = await snoozeWhatsAppPrompt(tenant.userId, days);

  // Log the action
  await logAction(
    tenant.tenantId,
    tenant.userId,
    ActivityActions.USER_UPDATED,
    'TeamMember',
    tenant.userId,
    {
      action: 'whatsapp_prompt_snoozed',
      snoozedUntil: snoozedUntil.toISOString(),
      days,
    }
  );

  return NextResponse.json({
    success: true,
    snoozedUntil: snoozedUntil.toISOString(),
    message: `Reminder snoozed for ${days} days`,
  });
}

export const DELETE = withErrorHandler(snoozePromptHandler, { requireAuth: true });
