/**
 * @file email-failure-templates.ts
 * @description Email templates for super admin notifications about email delivery failures.
 * @module lib/core
 */

import type { EmailFailureContext } from './email-failure-handler';
import { escapeHtml, DEFAULT_BRAND_COLOR, APP_DOMAIN } from './email-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Use the shared brand color
const BRAND_COLOR = DEFAULT_BRAND_COLOR;

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

function emailWrapper(content: string, orgName: string = 'Durj Platform'): string {
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
                &copy; 2026 ${orgName}. Platform Alert System.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL FAILURE ALERT TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════

export function emailFailureAlertEmail(context: EmailFailureContext): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Email Delivery Failure: ${context.organizationName} - ${context.module}`;

  const isLocalhost = APP_DOMAIN.includes('localhost');
  const protocol = isLocalhost ? 'http' : 'https';

  const tenantPortalUrl = `${protocol}://${context.organizationSlug}.${APP_DOMAIN}`;
  const superAdminUrl = `${protocol}://${APP_DOMAIN}/super-admin/organizations`;

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
            EMAIL DELIVERY FAILURE
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Email Failed to Send</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      An email notification failed to send in the platform. This may indicate an issue with the email service or recipient configuration.
    </p>

    <!-- Organization Details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid ${BRAND_COLOR}; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Organization Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Organization:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">
                <a href="${tenantPortalUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">
                  ${escapeHtml(context.organizationName)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subdomain:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.organizationSlug)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Module:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.module)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Action:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.action)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Email Details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fef9c3; border-radius: 8px; border-left: 4px solid #eab308; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #854d0e; margin: 0 0 15px 0; font-size: 16px;">Failed Email Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 35%;">Recipient:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(context.recipientName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email Address:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-family: monospace;">${escapeHtml(context.recipientEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subject:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(context.emailSubject)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Error Details -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff1f2; border-radius: 8px; border-left: 4px solid #f43f5e; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: #9f1239; margin: 0 0 15px 0; font-size: 16px;">Error Information</h3>
          <p style="margin: 0; color: #333333; font-size: 14px; font-family: monospace; word-break: break-word; background-color: #fef2f2; padding: 12px; border-radius: 4px;">
            ${escapeHtml(context.error)}
          </p>
          ${context.errorCode ? `
          <p style="margin: 10px 0 0 0; color: #666666; font-size: 12px;">
            Error Code: <code style="background-color: #fef2f2; padding: 2px 6px; border-radius: 3px;">${escapeHtml(context.errorCode)}</code>
          </p>
          ` : ''}
        </td>
      </tr>
    </table>

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

    <!-- Action Required -->
    <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
        Recommended Actions:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #555555; font-size: 14px; line-height: 1.8;">
        <li>Verify recipient email address is valid</li>
        <li>Check Resend API status and quota</li>
        <li>Review email service logs for additional details</li>
        <li>Confirm RESEND_API_KEY is configured correctly</li>
        <li>Check if domain is verified in Resend</li>
      </ul>
    </div>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${superAdminUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View Organization in Super Admin
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This is an automated alert from the Durj Platform monitoring system. The tenant admins have also been notified via in-app notification.
    </p>
  `, 'Durj Platform');

  const text = `
EMAIL DELIVERY FAILURE

An email notification failed to send in the platform.

Organization Details:
- Organization: ${context.organizationName}
- Subdomain: ${context.organizationSlug}
- Module: ${context.module}
- Action: ${context.action}

Failed Email Details:
- Recipient: ${context.recipientName}
- Email Address: ${context.recipientEmail}
- Subject: ${context.emailSubject}

Error Information:
${context.error}
${context.errorCode ? `Error Code: ${context.errorCode}` : ''}

${context.metadata ? `\nAdditional Context:\n${JSON.stringify(context.metadata, null, 2)}` : ''}

Recommended Actions:
- Verify recipient email address is valid
- Check Resend API status and quota
- Review email service logs for additional details
- Confirm RESEND_API_KEY is configured correctly
- Check if domain is verified in Resend

View organization: ${superAdminUrl}

---
This is an automated alert from the Durj Platform monitoring system.
The tenant admins have also been notified via in-app notification.
  `.trim();

  return { subject, html, text };
}

// Note: escapeHtml is imported from ./email-utils
