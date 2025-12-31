/**
 * @file email.ts
 * @description Email sending service using Resend - handles single and batch email sending
 * @module lib/core
 */

import { Resend } from 'resend';

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
}

export async function sendEmail({ to, subject, text, html, from }: EmailOptions) {
  // Skip sending if no API key configured (development mode)
  if (!process.env.RESEND_API_KEY) {
    return { success: true, messageId: 'dev-mode-skipped' };
  }

  const fromAddress = from || DEFAULT_FROM;
  const toAddresses = Array.isArray(to) ? to : [to];

  try {
    // Build email payload - at least text or html must be provided
    const emailPayload: {
      from: string;
      to: string[];
      subject: string;
      text?: string;
      html?: string;
    } = {
      from: fromAddress,
      to: toAddresses,
      subject,
    };

    if (text) emailPayload.text = text;
    if (html) emailPayload.html = html;

    // Fallback to text if neither provided
    if (!text && !html) {
      emailPayload.text = subject;
    }

    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }
    const { data, error } = await resend.emails.send(emailPayload as any);

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
