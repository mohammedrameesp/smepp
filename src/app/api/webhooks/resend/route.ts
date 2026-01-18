/**
 * @file route.ts
 * @description Resend webhook handler for email bounce and complaint tracking
 * @module webhooks/resend
 *
 * Webhook events handled:
 * - email.bounced: Email bounced (invalid address, mailbox full, etc.)
 * - email.complained: Recipient marked as spam
 * - email.delivery_delayed: Temporary delivery issues
 *
 * Setup:
 * 1. Go to Resend Dashboard > Webhooks
 * 2. Add endpoint: https://your-domain.com/api/webhooks/resend
 * 3. Select events: email.bounced, email.complained, email.delivery_delayed
 * 4. Copy signing secret to RESEND_WEBHOOK_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import crypto from 'crypto';

// Resend webhook event types
interface ResendWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.delivery_delayed';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    // Bounce-specific fields
    bounce?: {
      message: string;
      type?: string; // 'hard' or 'soft'
    };
    // Complaint-specific fields
    complaint?: {
      message: string;
      type?: string;
    };
  };
}

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false;

  try {
    // Resend uses svix for webhooks
    // Signature format: v1,<timestamp>,<signature>
    const parts = signature.split(',');
    if (parts.length < 3) return false;

    const timestamp = parts[1];
    const expectedSig = parts[2];

    // Create signed payload
    const signedPayload = `${timestamp}.${payload}`;
    const computedSig = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(computedSig)
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('svix-signature');
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret) {
      if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
        logger.warn('Invalid Resend webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      logger.warn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification');
    }

    const event: ResendWebhookEvent = JSON.parse(payload);

    // Only process failure events
    if (!['email.bounced', 'email.complained', 'email.delivery_delayed'].includes(event.type)) {
      return NextResponse.json({ received: true });
    }

    const { data } = event;
    const recipientEmail = data.to[0] || 'unknown';

    // Determine error message based on event type
    let errorMessage: string;
    let action: string;

    switch (event.type) {
      case 'email.bounced':
        errorMessage = data.bounce?.message || 'Email bounced - address may not exist';
        action = `bounce-${data.bounce?.type || 'unknown'}`;
        break;
      case 'email.complained':
        errorMessage = data.complaint?.message || 'Recipient marked email as spam';
        action = 'spam-complaint';
        break;
      case 'email.delivery_delayed':
        errorMessage = 'Email delivery delayed - temporary issue';
        action = 'delivery-delayed';
        break;
      default:
        errorMessage = 'Unknown delivery issue';
        action = 'unknown';
    }

    // Log to EmailFailureLog
    await prisma.emailFailureLog.create({
      data: {
        module: 'other',
        action: action,
        recipientEmail: recipientEmail,
        recipientName: null,
        emailSubject: data.subject || 'Unknown subject',
        error: errorMessage,
        errorCode: event.type,
        metadata: {
          emailId: data.email_id,
          from: data.from,
          eventType: event.type,
          eventTime: event.created_at,
          bounceType: data.bounce?.type,
          allRecipients: data.to,
        },
      },
    });

    logger.info(
      {
        eventType: event.type,
        emailId: data.email_id,
        recipient: recipientEmail,
      },
      'Resend webhook: email delivery failure logged'
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Resend webhook processing error'
    );
    // Return 200 to prevent Resend from retrying
    return NextResponse.json({ received: true, error: 'Processing error' });
  }
}

// Resend may send GET to verify endpoint exists
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'resend-webhook' });
}
