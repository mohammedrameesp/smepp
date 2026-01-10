/**
 * @file notification-sender.ts
 * @description Unified notification sender for email and in-app notifications.
 *              Provides non-blocking delivery for both channels.
 * @module core
 */

import { sendEmail, EmailOptions } from './email';
import {
  createNotification,
  createBulkNotifications,
  CreateNotificationInput,
} from '@/features/notifications/lib';

export interface SendNotificationsOptions {
  /**
   * Tenant ID (required)
   */
  tenantId: string;

  /**
   * Email notification options
   */
  email?: EmailOptions;

  /**
   * In-app notification options
   */
  inApp?: CreateNotificationInput;
}

export interface SendNotificationsResult {
  emailSent: boolean;
  inAppCreated: boolean;
}

/**
 * Send both email and in-app notifications in a non-blocking manner.
 * Failures in one channel don't affect the other.
 *
 * @example
 * ```typescript
 * await sendNotifications({
 *   tenantId,
 *   email: {
 *     to: user.email,
 *     subject: 'Asset Assigned',
 *     html: emailContent.html,
 *     text: emailContent.text,
 *   },
 *   inApp: NotificationTemplates.assetAssigned(userId, assetTag, model),
 * });
 * ```
 */
export async function sendNotifications(
  options: SendNotificationsOptions
): Promise<SendNotificationsResult> {
  const { tenantId, email, inApp } = options;
  const result: SendNotificationsResult = {
    emailSent: false,
    inAppCreated: false,
  };

  // Send both notifications in parallel, don't wait for completion
  const promises: Promise<void>[] = [];

  if (email) {
    promises.push(
      sendEmail(email)
        .then(() => {
          result.emailSent = true;
        })
        .catch((error) => {
          console.error('Failed to send email notification:', error);
        })
    );
  }

  if (inApp) {
    promises.push(
      createNotification(inApp, tenantId)
        .then((success) => {
          result.inAppCreated = success;
        })
        .catch((error) => {
          console.error('Failed to create in-app notification:', error);
        })
    );
  }

  // Wait for all to complete (or fail silently)
  await Promise.allSettled(promises);

  return result;
}

export interface BulkNotificationOptions {
  /**
   * Tenant ID (required)
   */
  tenantId: string;

  /**
   * Email notifications to send
   */
  emails?: EmailOptions[];

  /**
   * In-app notifications to create
   */
  inApp?: CreateNotificationInput[];
}

export interface BulkNotificationResult {
  emailsSent: number;
  inAppCreated: number;
}

/**
 * Send bulk notifications for both email and in-app.
 * Useful for notifying multiple users about the same event.
 *
 * @example
 * ```typescript
 * await sendBulkNotifications({
 *   tenantId,
 *   emails: admins.map(admin => ({
 *     to: admin.email,
 *     subject: 'New Request',
 *     html: emailContent.html,
 *     text: emailContent.text,
 *   })),
 *   inApp: admins.map(admin =>
 *     NotificationTemplates.leaveSubmitted(admin.id, requesterName, requestNumber)
 *   ),
 * });
 * ```
 */
export async function sendBulkNotifications(
  options: BulkNotificationOptions
): Promise<BulkNotificationResult> {
  const { tenantId, emails, inApp } = options;
  const result: BulkNotificationResult = {
    emailsSent: 0,
    inAppCreated: 0,
  };

  const promises: Promise<void>[] = [];

  // Send emails in parallel
  if (emails && emails.length > 0) {
    const emailPromises = emails.map((emailOptions) =>
      sendEmail(emailOptions)
        .then(() => {
          result.emailsSent++;
        })
        .catch((error) => {
          console.error('Failed to send email:', error);
        })
    );
    promises.push(...emailPromises);
  }

  // Create in-app notifications in bulk
  if (inApp && inApp.length > 0) {
    promises.push(
      createBulkNotifications(inApp, tenantId)
        .then((count) => {
          result.inAppCreated = count;
        })
        .catch((error) => {
          console.error('Failed to create in-app notifications:', error);
        })
    );
  }

  await Promise.allSettled(promises);

  return result;
}

/**
 * Fire-and-forget notification sender.
 * Use when you don't need to wait for completion or check results.
 *
 * @example
 * ```typescript
 * // Non-blocking notification
 * notifyAsync({
 *   tenantId,
 *   email: emailOptions,
 *   inApp: inAppOptions,
 * });
 * // Continues immediately without waiting
 * ```
 */
export function notifyAsync(options: SendNotificationsOptions): void {
  sendNotifications(options).catch((error) => {
    console.error('Async notification failed:', error);
  });
}

/**
 * Fire-and-forget bulk notification sender.
 */
export function notifyBulkAsync(options: BulkNotificationOptions): void {
  sendBulkNotifications(options).catch((error) => {
    console.error('Async bulk notification failed:', error);
  });
}
