/**
 * @file index.ts
 * @description Barrel export for email module - provides centralized access to all email functionality.
 * @module lib/email
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
