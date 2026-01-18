/**
 * @file notifications.ts
 * @description Validation schemas for in-app notification queries and filtering
 * @module domains/system/notifications/validations
 *
 * NOTIFICATION TYPES:
 * - LEAVE_REQUEST_SUBMITTED, LEAVE_REQUEST_APPROVED, LEAVE_REQUEST_REJECTED
 * - ASSET_ASSIGNED, ASSET_UNASSIGNED, ASSET_REQUEST_*, ASSET_RETURN_*
 * - PURCHASE_REQUEST_SUBMITTED, PURCHASE_REQUEST_APPROVED, PURCHASE_REQUEST_REJECTED
 * - DOCUMENT_EXPIRY_WARNING
 * - GENERAL
 *
 * USAGE:
 * Notifications are displayed in the bell icon dropdown (top nav).
 * Users can filter by read/unread status.
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query schema for listing notifications with pagination and filtering.
 *
 * @example
 * // GET /api/notifications?isRead=false&p=1&ps=10
 * // Returns unread notifications, page 1, 10 per page
 */
export const notificationQuerySchema = z.object({
  /** Filter by read status (optional) */
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  /** Page number (1-based, default: 1) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 10000, default: 20) */
  ps: z.coerce.number().min(1).max(10000).default(20),
});

/** Inferred type for notification query parameters */
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;
