/**
 * @file sender.ts
 * @description Unified email sending utility with built-in failure handling.
 *              Eliminates duplicate try/catch patterns across the codebase.
 * @module lib/email
 */

import { sendEmail } from './client';
import { handleEmailFailure, EmailFailureContext } from './failure-handler';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SendEmailWithFailureHandlingOptions {
  /** Recipient email address */
  to: string;
  /** Email subject */
  subject: string;
  /** HTML content */
  html: string;
  /** Plain text content (optional) */
  text?: string;

  // Context for failure handling
  /** Module name (e.g., 'assets', 'leave', 'payroll') */
  module: EmailFailureContext['module'];
  /** Action being performed (e.g., 'approve', 'reject', 'assign') */
  action: string;
  /** Tenant ID */
  tenantId: string;
  /** Organization name */
  orgName: string;
  /** Organization slug */
  orgSlug: string;
  /** Recipient name (for failure reports) */
  recipientName?: string;
  /** Additional metadata for failure context */
  metadata?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLE EMAIL SENDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send an email with automatic failure handling.
 * On failure, logs the error and creates a failure record for admin notification.
 *
 * @returns true if email sent successfully, false otherwise
 *
 * @example
 * const sent = await sendEmailWithFailureHandling({
 *   to: user.email,
 *   subject: 'Asset Request Approved',
 *   html: emailHtml,
 *   text: emailText,
 *   module: 'assets',
 *   action: 'approve',
 *   tenantId,
 *   orgName: organization.name,
 *   orgSlug: organization.slug,
 *   recipientName: user.name,
 *   metadata: { requestId: request.id },
 * });
 *
 * if (!sent) {
 *   // Handle the case where email failed (optional - failure is already logged)
 * }
 */
export async function sendEmailWithFailureHandling(
  options: SendEmailWithFailureHandlingOptions
): Promise<boolean> {
  const {
    to,
    subject,
    html,
    text,
    module,
    action,
    tenantId,
    orgName,
    orgSlug,
    recipientName,
    metadata,
  } = options;

  try {
    const result = await sendEmail({
      to,
      subject,
      html,
      text,
      tenantId, // Use org-specific SMTP if configured
    });

    // sendEmail returns { success, messageId?, error? } instead of throwing
    if (result.success) {
      return true;
    }

    // Email failed - handle the failure
    const errorMessage = result.error || 'Unknown email error';

    // Log the error
    logger.error(
      {
        error: errorMessage,
        module,
        action,
        recipient: to,
        tenantId,
      },
      `Failed to send ${module} email notification`
    );

    // Handle the failure (creates record for admin notification)
    await safeHandleEmailFailure({
      module,
      action,
      tenantId,
      organizationName: orgName,
      organizationSlug: orgSlug,
      recipientEmail: to,
      recipientName: recipientName || to,
      emailSubject: subject,
      error: errorMessage,
      metadata,
    });

    return false;
  } catch (emailError) {
    // Handle unexpected exceptions (should be rare with sendEmail's try/catch)
    const errorMessage =
      emailError instanceof Error ? emailError.message : 'Unknown email error';

    // Log the error
    logger.error(
      {
        error: errorMessage,
        module,
        action,
        recipient: to,
        tenantId,
      },
      `Failed to send ${module} email notification`
    );

    // Handle the failure (creates record for admin notification)
    await safeHandleEmailFailure({
      module,
      action,
      tenantId,
      organizationName: orgName,
      organizationSlug: orgSlug,
      recipientEmail: to,
      recipientName: recipientName || to,
      emailSubject: subject,
      error: errorMessage,
      metadata,
    });

    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK EMAIL SENDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send multiple emails with failure handling.
 * Processes all emails and returns results for each.
 *
 * @example
 * const results = await sendBulkEmailsWithFailureHandling(
 *   recipients.map(r => ({
 *     to: r.email,
 *     subject: 'Notification',
 *     html: generateHtml(r),
 *     module: 'assets',
 *     action: 'bulk-notify',
 *     tenantId,
 *     orgName,
 *     orgSlug,
 *   }))
 * );
 *
 * console.log(`Sent: ${results.filter(r => r.success).length}`);
 */
export async function sendBulkEmailsWithFailureHandling(
  emails: SendEmailWithFailureHandlingOptions[]
): Promise<{ email: string; success: boolean }[]> {
  const results = await Promise.allSettled(
    emails.map(async (email) => {
      const success = await sendEmailWithFailureHandling(email);
      return { email: email.to, success };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { email: emails[index].to, success: false };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely handle email failure without throwing.
 * Wraps handleEmailFailure to ensure errors don't propagate.
 */
async function safeHandleEmailFailure(
  context: EmailFailureContext
): Promise<void> {
  try {
    await handleEmailFailure(context);
  } catch (failureHandlerError) {
    // Don't let failure handler errors propagate
    logger.error(
      {
        error:
          failureHandlerError instanceof Error
            ? failureHandlerError.message
            : 'Unknown error',
        module: context.module,
        action: context.action,
      },
      'Failed to handle email failure'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Re-export the original sendEmail for cases where failure handling isn't needed
export { sendEmail } from './client';
