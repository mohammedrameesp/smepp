/**
 * @file index.ts
 * @description Notifications module exports. Re-exports notification service functions and
 *              templates for creating in-app notifications across the platform.
 * @module domains/system/notifications
 */

export {
  createNotification,
  createBulkNotifications,
  NotificationTemplates,
  type CreateNotificationInput,
} from './notification-service';
