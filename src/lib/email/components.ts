/**
 * @file components.ts
 * @description Shared HTML component builders for email templates.
 * @module lib/email
 */

import type { AlertType, AlertColorScheme } from './types';
import { escapeHtml, DEFAULT_BRAND_COLOR } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic alert color palette for different notification types.
 * Used consistently across all email templates.
 */
export const ALERT_STYLES: Record<AlertType, AlertColorScheme> = {
  info: { bg: '#e8f4fd', border: '#73c5d1', text: '#0c5460' },
  success: { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
  error: { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HTML COMPONENT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an alert banner for the top of emails.
 * @param type - Alert type (info, success, warning, error)
 * @param message - Alert message text
 * @param brandColor - Optional brand color for info type border
 */
export function alertBanner(type: AlertType, message: string, brandColor?: string): string {
  const style = ALERT_STYLES[type];
  // For info alerts, allow brand color override; others use their semantic color
  const borderColor = type === 'info' ? (brandColor || style.border) : style.border;

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${style.bg}; border-left: 4px solid ${borderColor}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: ${style.text}; font-size: 14px; margin: 0; font-weight: bold;">${message}</p>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate a details table with key-value rows.
 * @param title - Table heading
 * @param rows - Array of [label, value] pairs
 * @param brandColor - Brand color for title
 */
export function detailsTable(
  title: string,
  rows: ReadonlyArray<readonly [string, string]>,
  brandColor: string
): string {
  const rowsHtml = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">${label}:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;${label === 'Request Number' ? ' font-weight: bold;' : ''}">${value}</td>
            </tr>`
    )
    .join('');

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">${title}</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${rowsHtml}
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate a highlighted info block for reasons/notes.
 * @param title - Block heading
 * @param content - Block content (will be escaped)
 * @param type - Visual style (info or error)
 * @param brandColor - Brand color for info type
 */
export function infoBlock(
  title: string,
  content: string,
  type: 'info' | 'error' = 'info',
  brandColor?: string
): string {
  const style = ALERT_STYLES[type];
  const titleColor = type === 'info' ? (brandColor || DEFAULT_BRAND_COLOR) : style.text;

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${style.bg}; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${titleColor}; margin: 0 0 10px 0; font-size: 14px;">${title}:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${escapeHtml(content)}</p>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate a call-to-action button.
 * @param text - Button label
 * @param url - Button link URL
 * @param brandColor - Button background color
 */
export function actionButton(text: string, url: string, brandColor: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">${text}</a>
        </td>
      </tr>
    </table>`;
}

/**
 * Generate greeting paragraph for user-facing emails.
 * @param userName - User's display name
 */
export function greeting(userName: string): string {
  return `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear <strong>${escapeHtml(userName)}</strong>,</p>`;
}

/**
 * Generate the email closing signature.
 * @param orgName - Organization name
 */
export function signature(orgName: string): string {
  return `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">Best regards,<br><strong>${orgName}</strong></p>`;
}

/**
 * Generate a paragraph element.
 * @param text - Paragraph content (not escaped - may contain HTML)
 */
export function paragraph(text: string): string {
  return `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${text}</p>`;
}

/**
 * Generate heading element.
 * @param text - Heading content
 */
export function heading(text: string): string {
  return `<h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">${text}</h2>`;
}

/**
 * Format asset display string.
 * @param brand - Asset brand (optional)
 * @param model - Asset model
 */
export function formatAsset(brand: string | null, model: string): string {
  return `${brand || ''} ${model}`.trim();
}
