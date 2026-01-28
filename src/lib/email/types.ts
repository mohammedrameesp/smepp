/**
 * @file types.ts
 * @description Unified type definitions for the email module.
 * @module lib/email
 *
 * @example
 * ```ts
 * import type { EmailTemplateResult, AlertType } from '@/lib/email';
 *
 * function myTemplate(): EmailTemplateResult {
 *   return {
 *     subject: 'Welcome',
 *     html: '<p>Hello</p>',
 *     text: 'Hello',
 *   };
 * }
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard email template output with HTML and plain text versions.
 * Used by all email template functions.
 */
export interface EmailTemplateResult {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Alert type for banner styling */
export type AlertType = 'info' | 'success' | 'warning' | 'error';

/** Color scheme for alerts */
export interface AlertColorScheme {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL WRAPPER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for the unified email wrapper.
 */
export interface EmailWrapperOptions {
  /** The main HTML content of the email body */
  content: string;
  /** Organization name to display (optional for system emails) */
  orgName?: string;
  /** Brand color for header background */
  brandColor?: string;
  /** Timezone for footer timestamp */
  timezone?: string;
  /**
   * Wrapper variant:
   * - 'branded': Full branding with org header/footer (default)
   * - 'system': Simplified wrapper for system alerts (no org branding)
   */
  variant?: 'branded' | 'system';
}
