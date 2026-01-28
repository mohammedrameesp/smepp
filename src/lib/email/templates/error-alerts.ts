/**
 * @file error-alerts.ts
 * @description Email templates for super admin notifications about system errors.
 * @module lib/email/templates
 */

import type { ErrorContext, ErrorSeverity } from '@/lib/core/error-logger';
import type { EmailTemplateResult, AlertColorScheme } from '../types';
import { escapeHtml, DEFAULT_BRAND_COLOR, APP_DOMAIN, systemEmailWrapper } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Email template output with subject, HTML body, and plain text fallback.
 * @deprecated Use EmailTemplateResult from '../types' instead
 */
export type EmailTemplate = EmailTemplateResult;

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Brand color for email header and CTA buttons */
const BRAND_COLOR = DEFAULT_BRAND_COLOR;

/** Default severity level when not specified in error context */
const DEFAULT_SEVERITY: ErrorSeverity = 'error';

/** Color schemes for each severity level */
const SEVERITY_COLORS: Record<ErrorSeverity, AlertColorScheme> = {
  warning: { bg: '#fef9c3', border: '#eab308', text: '#854d0e' },
  error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  critical: { bg: '#fecaca', border: '#dc2626', text: '#7f1d1d' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEM ERROR ALERT TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate email template for system error alerts sent to super admin.
 * Includes error classification, request details, user context, and stack trace.
 *
 * @param context - Error context with type, source, message, and optional metadata
 * @returns Email template with subject, HTML, and plain text versions
 *
 * @example
 * ```ts
 * const email = systemErrorAlertEmail({
 *   type: 'API_ERROR',
 *   source: 'assets',
 *   action: 'create',
 *   message: 'Database connection failed',
 *   severity: 'error',
 *   tenantId: 'org_123',
 * });
 * ```
 */
export function systemErrorAlertEmail(context: ErrorContext): EmailTemplateResult {
  const severity = context.severity || DEFAULT_SEVERITY;
  const severityColors = SEVERITY_COLORS[severity];
  const severityLabel = severity.toUpperCase();

  const subject = `[${severityLabel}] System Error: ${context.source}${context.action ? ` - ${context.action}` : ''}`;

  const isLocalhost = APP_DOMAIN.includes('localhost');
  const protocol = isLocalhost ? 'http' : 'https';
  const superAdminUrl = `${protocol}://${APP_DOMAIN}/super-admin/error-logs`;

  const html = systemEmailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${severityColors.bg}; border-left: 4px solid ${severityColors.border}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="margin: 0; color: ${severityColors.text}; font-size: 14px; font-weight: 600;">
            ${severityLabel} - SYSTEM ERROR
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">System Error Detected</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A system error has been logged in the platform. Please review the details below and take appropriate action.
    </p>

    <!-- Error Classification -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid ${BRAND_COLOR}; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Error Classification</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Type:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(context.type)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Source:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.source)}</td>
            </tr>
            ${context.action ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Action:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.action)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Severity:</td>
              <td style="padding: 8px 0;">
                <span style="display: inline-block; padding: 4px 12px; background-color: ${severityColors.bg}; color: ${severityColors.text}; font-size: 12px; font-weight: bold; border-radius: 4px;">${severityLabel}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Request Details (if available) -->
    ${context.method || context.path ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f3ff; border-radius: 8px; border-left: 4px solid #8b5cf6; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #6d28d9; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${context.method ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Method:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${escapeHtml(context.method)}</td>
            </tr>
            ` : ''}
            ${context.path ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Path:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${escapeHtml(context.path)}</td>
            </tr>
            ` : ''}
            ${context.statusCode ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Status Code:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${context.statusCode}</td>
            </tr>
            ` : ''}
            ${context.requestId ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Request ID:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${escapeHtml(context.requestId)}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- User Context (if available) -->
    ${context.userId || context.userEmail || context.tenantId ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef9c3; border-radius: 8px; border-left: 4px solid #eab308; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #854d0e; margin: 0 0 15px 0; font-size: 16px;">User Context</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${context.tenantId ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Tenant ID:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${escapeHtml(context.tenantId)}</td>
            </tr>
            ` : ''}
            ${context.userId ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">User ID:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${escapeHtml(context.userId)}</td>
            </tr>
            ` : ''}
            ${context.userEmail ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">User Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.userEmail)}</td>
            </tr>
            ` : ''}
            ${context.userRole ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">User Role:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.userRole)}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- Error Message -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff1f2; border-radius: 8px; border-left: 4px solid #f43f5e; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #9f1239; margin: 0 0 15px 0; font-size: 16px;">Error Message</h3>
          <p style="margin: 0; color: #333333; font-size: 14px; font-family: monospace; word-break: break-word; background-color: #fef2f2; padding: 12px; border-radius: 4px;">
            ${escapeHtml(context.message)}
          </p>
          ${context.errorCode ? `
          <p style="margin: 10px 0 0 0; color: #666666; font-size: 12px;">
            Error Code: <code style="background-color: #fef2f2; padding: 2px 6px; border-radius: 3px;">${escapeHtml(context.errorCode)}</code>
          </p>
          ` : ''}
        </td>
      </tr>
    </table>

    <!-- Stack Trace (if available) -->
    ${context.stack ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #666666; margin: 0 0 15px 0; font-size: 16px;">Stack Trace</h3>
          <pre style="margin: 0; color: #333333; font-size: 11px; font-family: monospace; white-space: pre-wrap; word-break: break-word; background-color: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 4px; max-height: 300px; overflow-y: auto;">${escapeHtml(context.stack)}</pre>
        </td>
      </tr>
    </table>
    ` : ''}

    ${context.metadata && Object.keys(context.metadata).length > 0 ? `
    <!-- Additional Context -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #666666; margin: 0 0 15px 0; font-size: 16px;">Additional Context</h3>
          <pre style="margin: 0; color: #333333; font-size: 12px; font-family: monospace; white-space: pre-wrap; word-break: break-word; background-color: #ffffff; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">${escapeHtml(JSON.stringify(context.metadata, null, 2))}</pre>
        </td>
      </tr>
    </table>
    ` : ''}

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${superAdminUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View Error Logs
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated alert from the Durj Platform error monitoring system.
    </p>
  `);

  const text = `
[${severityLabel}] SYSTEM ERROR

A system error has been logged in the platform.

Error Classification:
- Type: ${context.type}
- Source: ${context.source}
${context.action ? `- Action: ${context.action}` : ''}
- Severity: ${severityLabel}

${context.method || context.path ? `Request Details:
${context.method ? `- Method: ${context.method}` : ''}
${context.path ? `- Path: ${context.path}` : ''}
${context.statusCode ? `- Status Code: ${context.statusCode}` : ''}
${context.requestId ? `- Request ID: ${context.requestId}` : ''}
` : ''}

${context.tenantId || context.userId || context.userEmail ? `User Context:
${context.tenantId ? `- Tenant ID: ${context.tenantId}` : ''}
${context.userId ? `- User ID: ${context.userId}` : ''}
${context.userEmail ? `- User Email: ${context.userEmail}` : ''}
${context.userRole ? `- User Role: ${context.userRole}` : ''}
` : ''}

Error Message:
${context.message}
${context.errorCode ? `Error Code: ${context.errorCode}` : ''}

${context.stack ? `Stack Trace:
${context.stack}
` : ''}

${context.metadata ? `Additional Context:
${JSON.stringify(context.metadata, null, 2)}
` : ''}

View error logs: ${superAdminUrl}

---
This is an automated alert from the Durj Platform error monitoring system.
  `.trim();

  return { subject, html, text };
}
