/**
 * @file email-failure-handler.ts
 * @description Centralized email failure notification service.
 *              Notifies tenant admins (in-app) and super admin (email) when emails fail.
 * @module lib/core
 */

import { prisma } from './prisma';
import { sendEmail } from './email';
import { createBulkNotifications } from '@/features/notifications/lib/notification-service';
import { NotificationType } from '@prisma/client';
import logger from './log';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmailFailureContext {
  // Module information
  module: 'assets' | 'asset-requests' | 'leave' | 'purchase-requests' | 'suppliers' | 'hr' | 'auth' | 'other';
  action: string; // e.g., "assignment", "approval", "rejection"

  // Tenant context
  tenantId: string;
  organizationName: string;
  organizationSlug: string;

  // Target user information
  recipientEmail: string;
  recipientName: string;

  // Email details
  emailSubject: string;

  // Error information
  error: string;
  errorCode?: string;

  // Additional context
  metadata?: Record<string, unknown>;
}

// Rate limiting to prevent spam during outages
const recentAlerts = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between identical alerts

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Handle email delivery failure by notifying both tenant admins (in-app)
 * and super admin (email). Non-blocking - failures are logged but don't throw.
 */
export async function handleEmailFailure(context: EmailFailureContext): Promise<void> {
  // Check rate limiting
  const alertKey = `${context.tenantId}:${context.module}:${context.action}:${context.recipientEmail}`;
  const lastAlert = recentAlerts.get(alertKey);
  const now = Date.now();

  if (lastAlert && now - lastAlert < ALERT_COOLDOWN_MS) {
    logger.debug(
      { alertKey, lastAlertAgo: now - lastAlert },
      'Skipping duplicate email failure alert (rate limited)'
    );
    return;
  }

  recentAlerts.set(alertKey, now);

  // Clean up old entries periodically
  if (recentAlerts.size > 100) {
    const cutoff = now - ALERT_COOLDOWN_MS;
    for (const [key, time] of recentAlerts) {
      if (time < cutoff) {
        recentAlerts.delete(key);
      }
    }
  }

  // Run notifications in parallel
  await Promise.all([
    notifyTenantAdmins(context),
    notifySuperAdmin(context),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send in-app notifications to all tenant admins about the email failure.
 */
async function notifyTenantAdmins(context: EmailFailureContext): Promise<void> {
  try {
    const admins = await prisma.teamMember.findMany({
      where: {
        tenantId: context.tenantId,
        isAdmin: true,
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      logger.debug({ tenantId: context.tenantId }, 'No tenant admins to notify about email failure');
      return;
    }

    const notifications = admins.map((admin) => ({
      recipientId: admin.id,
      title: 'Email Notification Failed',
      message: `Failed to send ${context.action} email in ${context.module} module to ${context.recipientName} (${context.recipientEmail}). Error: ${context.error}`,
      type: 'GENERAL' as NotificationType,
    }));

    await createBulkNotifications(notifications, context.tenantId);
    logger.info(
      { tenantId: context.tenantId, adminCount: admins.length, module: context.module },
      'Notified tenant admins about email failure'
    );
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), tenantId: context.tenantId },
      'Failed to notify tenant admins about email failure'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send email to super admin about the email failure.
 */
async function notifySuperAdmin(context: EmailFailureContext): Promise<void> {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) {
    logger.warn('SUPER_ADMIN_EMAIL not configured - cannot send email failure alert');
    return;
  }

  try {
    const { emailFailureAlertEmail } = await import('./email-failure-templates');
    const emailData = emailFailureAlertEmail(context);

    const result = await sendEmail({
      to: superAdminEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    if (result.success) {
      logger.info(
        { tenantId: context.tenantId, module: context.module, action: context.action },
        'Sent email failure alert to super admin'
      );
    } else {
      // Don't recurse - just log the meta-failure
      logger.error(
        { error: result.error, tenantId: context.tenantId },
        'Failed to send email failure alert to super admin'
      );
    }
  } catch (error) {
    // Don't throw - this is already an error handler
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Exception while notifying super admin about email failure'
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to get organization details for email failure context.
 * Returns null if organization not found.
 */
export async function getOrganizationContext(
  tenantId: string
): Promise<{ name: string; slug: string } | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    });
    return org;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error), tenantId },
      'Failed to get organization context for email failure'
    );
    return null;
  }
}
