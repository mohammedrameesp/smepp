/**
 * @file utils.ts
 * @description Shared email utility functions used across email template files.
 *              Includes HTML escaping, URL generation, and email wrappers.
 * @module lib/email
 *
 * @example
 * ```ts
 * import { emailWrapper, escapeHtml, getTenantPortalUrl } from '@/lib/email';
 *
 * const html = emailWrapper(
 *   `<p>Hello, ${escapeHtml(userName)}</p>`,
 *   'Acme Corp',
 *   '#3B82F6'
 * );
 *
 * const url = getTenantPortalUrl('acme', '/admin/dashboard');
 * ```
 */

import { QATAR_TIMEZONE } from '@/lib/core/datetime';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default brand color (slate-900) used when organization color is not provided */
export const DEFAULT_BRAND_COLOR = '#0f172a';

/** Application domain from environment or fallback to localhost */
export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Re-export QATAR_TIMEZONE for consumers that import from email-utils
export { QATAR_TIMEZONE };

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML special characters to prevent XSS attacks.
 * Use this for any user-provided content interpolated into email HTML.
 *
 * @param text - The text to escape (handles null/undefined safely)
 * @returns Escaped HTML string, or empty string if input is falsy
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get tenant-specific portal URL.
 *
 * @param orgSlug - Organization slug for subdomain
 * @param path - Optional path to append (e.g., '/admin', '/profile')
 * @returns Full URL including protocol and subdomain
 */
export function getTenantPortalUrl(orgSlug: string, path: string = ''): string {
  const isLocalhost = APP_DOMAIN.includes('localhost');
  const protocol = isLocalhost ? 'http' : 'https';
  return `${protocol}://${orgSlug}.${APP_DOMAIN}${path}`;
}

/**
 * Format current timestamp for email footers.
 *
 * @param timezone - Timezone for formatting (defaults to Asia/Qatar)
 * @returns Formatted date string in en-GB locale
 */
export function formatTimestamp(timezone: string = QATAR_TIMEZONE): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrap email content in a consistent HTML template with header and footer.
 * Used for branded tenant emails with organization header.
 *
 * @param content - The main HTML content of the email body
 * @param orgName - Organization name to display in header
 * @param brandColor - Optional brand color for header background (defaults to DEFAULT_BRAND_COLOR)
 * @param timezone - Optional timezone for footer timestamp (defaults to Asia/Qatar)
 * @returns Complete HTML email document
 */
export function emailWrapper(
  content: string,
  orgName: string,
  brandColor?: string,
  timezone?: string
): string {
  const color = brandColor || DEFAULT_BRAND_COLOR;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="background-color: ${color}; padding: 30px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${orgName}</h1>
      </td>
    </tr>

    <!-- Main Content -->
    <tr>
      <td style="padding: 40px;">
        ${content}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #eeeeee;">
        <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0;">
          This is an automated message from ${orgName}.
        </p>
        <p style="color: #888888; font-size: 12px; margin: 0;">
          Generated on ${formatTimestamp(timezone)}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Wrap email content in a simplified HTML template for system alerts.
 * Used for super admin notifications without organization branding.
 *
 * @param content - The main HTML content of the email body
 * @param footerText - Optional footer text (defaults to 'Durj Platform')
 * @returns Complete HTML email document
 */
export function systemEmailWrapper(content: string, footerText: string = 'Durj Platform'): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                &copy; ${new Date().getFullYear()} ${footerText}. Platform Alert System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
