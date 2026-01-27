/**
 * @file client.ts
 * @description Email sending service using Resend or custom SMTP - handles single and batch email sending
 * @module lib/email
 */

import { Resend } from 'resend';
import { prisma } from '@/lib/core/prisma';
import { decrypt } from '@/lib/oauth/utils';
import logger from '@/lib/core/log';

// Nodemailer types (dynamically imported to avoid Edge Runtime issues)
type Transporter = Awaited<ReturnType<typeof import('nodemailer')['createTransport']>>;

// Lazy initialization to avoid throwing at module load time when API key is missing
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Default from address - must use a verified domain in Resend
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'Durj <noreply@durj.com>';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  /** Organization ID - if provided, will check for custom SMTP config */
  tenantId?: string;
}

/**
 * Get custom SMTP transporter for an organization if configured
 * Uses dynamic import for nodemailer to avoid Edge Runtime bundling issues
 */
async function getCustomSmtpTransporter(tenantId: string): Promise<{ transporter: Transporter; from: string } | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        customSmtpHost: true,
        customSmtpPort: true,
        customSmtpUser: true,
        customSmtpPassword: true,
        customSmtpSecure: true,
        customEmailFrom: true,
        customEmailName: true,
      },
    });

    if (!org?.customSmtpHost || !org?.customSmtpPort || !org?.customSmtpUser ||
        !org?.customSmtpPassword || !org?.customEmailFrom) {
      return null;
    }

    const smtpPassword = decrypt(org.customSmtpPassword);
    if (!smtpPassword) {
      logger.error({ tenantId }, 'Failed to decrypt SMTP password for organization');
      return null;
    }

    // Dynamic import to avoid Edge Runtime bundling issues
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: org.customSmtpHost,
      port: org.customSmtpPort,
      secure: org.customSmtpSecure,
      auth: {
        user: org.customSmtpUser,
        pass: smtpPassword,
      },
    });

    const from = org.customEmailName
      ? `"${org.customEmailName}" <${org.customEmailFrom}>`
      : org.customEmailFrom;

    return { transporter, from };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', tenantId },
      'Failed to get custom SMTP transporter');
    return null;
  }
}

export async function sendEmail({ to, subject, text, html, from, tenantId }: EmailOptions) {
  const toAddresses = Array.isArray(to) ? to : [to];

  // Skip placeholder emails for non-login users (nologin-xxx@org.internal)
  const realAddresses = toAddresses.filter(email => !email.endsWith('.internal'));
  if (realAddresses.length === 0) {
    logger.debug({ originalTo: to }, 'Skipping email - all recipients are .internal addresses');
    return { success: true, skipped: true };
  }

  // Check for custom SMTP first if tenantId is provided
  if (tenantId) {
    const customSmtp = await getCustomSmtpTransporter(tenantId);
    if (customSmtp) {
      try {
        const info = await customSmtp.transporter.sendMail({
          from: customSmtp.from,
          to: realAddresses.join(', '),
          subject,
          text: text || subject,
          html,
        });

        logger.info({ tenantId, messageId: info.messageId }, 'Email sent via custom SMTP');
        return { success: true, messageId: info.messageId };
      } catch (error) {
        logger.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          tenantId,
        }, 'Custom SMTP email failed');
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
  }

  // Fallback to Resend (platform default)
  // Skip sending if no API key configured (development mode)
  if (!process.env.RESEND_API_KEY) {
    return { success: true, messageId: 'dev-mode-skipped' };
  }

  const fromAddress = from || DEFAULT_FROM;

  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

    // Build email payload - Resend requires at least text or html
    // We explicitly type the payload to match Resend's CreateEmailOptions
    const basePayload = {
      from: fromAddress,
      to: realAddresses,
      subject,
    };

    // Determine content: prefer html if provided, fallback to text, then subject
    const emailContent = html
      ? { html, text }  // Include both if html is provided
      : text
        ? { text }      // Just text if provided
        : { text: subject }; // Fallback to subject as text

    const { data, error } = await resend.emails.send({
      ...basePayload,
      ...emailContent,
    });

    if (error) {
      console.error('[Email] Resend API error:', JSON.stringify(error));
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('[Email] Exception during send:', error instanceof Error ? error.message : error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Batch send emails (more efficient for multiple recipients)
export async function sendBatchEmails(emails: EmailOptions[]) {
  if (!process.env.RESEND_API_KEY) {
    return { success: true, results: emails.map(() => ({ messageId: 'dev-mode-skipped' })) };
  }

  const results = await Promise.allSettled(
    emails.map((email) => sendEmail(email))
  );

  return {
    success: results.every((r) => r.status === 'fulfilled' && r.value.success),
    results: results.map((r) => (r.status === 'fulfilled' ? r.value : { success: false, error: 'Failed' })),
  };
}
