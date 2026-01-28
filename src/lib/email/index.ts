/**
 * @file index.ts
 * @description Barrel export for email module - provides centralized access to all email functionality.
 *
 * The email module provides:
 * - `sendEmail` / `sendBatchEmails` - Low-level email sending
 * - `sendEmailWithFailureHandling` - High-level sending with failure tracking
 * - Email templates for all platform notifications
 * - Shared HTML components for building new templates
 *
 * @module lib/email
 *
 * @example
 * ```ts
 * import {
 *   sendEmailWithFailureHandling,
 *   welcomeUserEmail,
 *   emailWrapper,
 * } from '@/lib/email';
 *
 * // Use a pre-built template
 * const { subject, html, text } = welcomeUserEmail({
 *   userName: 'John',
 *   userEmail: 'john@example.com',
 *   userRole: 'MEMBER',
 *   orgSlug: 'acme',
 *   orgName: 'Acme Corp',
 *   authMethods: { hasGoogle: true, hasMicrosoft: false, hasPassword: true },
 * });
 *
 * // Send with automatic failure handling
 * await sendEmailWithFailureHandling({
 *   to: 'john@example.com',
 *   subject,
 *   html,
 *   text,
 *   module: 'users',
 *   action: 'welcome',
 *   tenantId: 'org_123',
 *   orgName: 'Acme Corp',
 *   orgSlug: 'acme',
 * });
 * ```
 */

// Core email functionality
export { sendEmail, sendBatchEmails } from './client';
export type { EmailOptions } from './client';

// Email sender with failure handling
export { sendEmailWithFailureHandling, sendBulkEmailsWithFailureHandling } from './sender';
export type { SendEmailWithFailureHandlingOptions } from './sender';

// Utilities
export {
  escapeHtml,
  getTenantPortalUrl,
  formatTimestamp,
  emailWrapper,
  systemEmailWrapper,
  DEFAULT_BRAND_COLOR,
  APP_DOMAIN,
  QATAR_TIMEZONE,
} from './utils';

// Types
export type { EmailTemplateResult, AlertType, AlertColorScheme, EmailWrapperOptions } from './types';

// Components (shared HTML builders)
export {
  ALERT_STYLES,
  alertBanner,
  detailsTable,
  infoBlock,
  actionButton,
  greeting,
  signature,
  paragraph,
  heading,
  formatAsset,
} from './components';

// Failure handling
export { handleEmailFailure, getOrganizationContext } from './failure-handler';
export type { EmailFailureContext } from './failure-handler';

// Templates (re-export from templates/index.ts)
export * from './templates';
