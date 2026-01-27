/**
 * @file asset-request-emails.ts
 * @description Email templates for the asset request workflow.
 *              Covers the complete lifecycle: request, assignment, acceptance,
 *              rejection, return request, and unassignment notifications.
 * @module lib/core
 *
 * @example
 * ```ts
 * import { assetRequestSubmittedEmail } from '@/lib/core/asset-request-emails';
 *
 * const email = assetRequestSubmittedEmail({
 *   requestNumber: 'AR-001',
 *   assetModel: 'MacBook Pro',
 *   assetBrand: 'Apple',
 *   assetType: 'Laptop',
 *   requesterName: 'John Doe',
 *   requesterEmail: 'john@example.com',
 *   reason: 'Need for development work',
 *   orgSlug: 'acme',
 *   orgName: 'Acme Corp',
 * });
 *
 * await sendEmail({ to: admin.email, ...email });
 * ```
 */

import { escapeHtml, getTenantPortalUrl, emailWrapper } from './email-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default brand color for asset request emails (Durj teal).
 * Organization's primaryColor can override this.
 */
const DEFAULT_BRAND_COLOR = '#73c5d1' as const;

/**
 * Semantic alert color palette for different notification types.
 */
const ALERT_STYLES = {
  info: { bg: '#e8f4fd', border: '#73c5d1', text: '#0c5460' },
  success: { bg: '#dcfce7', border: '#22c55e', text: '#15803d' },
  warning: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
  error: { bg: '#fee2e2', border: '#dc2626', text: '#dc2626' },
} as const;

type AlertType = keyof typeof ALERT_STYLES;

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard email output format with HTML and plain text versions.
 */
interface EmailResult {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base data common to all asset request emails.
 */
interface AssetRequestEmailData {
  readonly assetTag: string | null;
  readonly assetModel: string;
  readonly assetBrand: string | null;
  readonly assetType: string;
  readonly orgSlug: string;
  readonly orgName: string;
  readonly primaryColor?: string;
}

/**
 * Data for request submission notification (employee -> admin).
 */
interface AssetRequestSubmittedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly requesterName: string;
  readonly requesterEmail: string;
  readonly reason: string;
}

/**
 * Data for pending assignment notification (admin -> user).
 */
interface AssetAssignmentPendingData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly assignerName: string;
  readonly reason?: string;
}

/**
 * Data for assignment accepted notification (user -> admin).
 */
interface AssetAssignmentAcceptedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly userEmail: string;
}

/**
 * Data for assignment declined notification (user -> admin).
 */
interface AssetAssignmentDeclinedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly reason: string;
}

/**
 * Data for return request notification (user -> admin).
 */
interface AssetReturnRequestData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly reason: string;
}

/**
 * Data for request approved notification (admin -> user).
 */
interface AssetRequestApprovedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly approverName: string;
}

/**
 * Data for request rejected notification (admin -> user).
 */
interface AssetRequestRejectedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly rejectorName: string;
  readonly reason: string;
}

/**
 * Data for return approved notification (admin -> user).
 */
interface AssetReturnApprovedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly approverName: string;
}

/**
 * Data for return rejected notification (admin -> user).
 */
interface AssetReturnRejectedData extends AssetRequestEmailData {
  readonly requestNumber: string;
  readonly userName: string;
  readonly rejectorName: string;
  readonly reason: string;
}

/**
 * Data for direct unassignment notification (admin -> user).
 */
interface AssetUnassignedData {
  readonly assetTag: string | null;
  readonly assetModel: string;
  readonly assetBrand: string | null;
  readonly assetType: string;
  readonly userName: string;
  readonly adminName: string;
  readonly reason?: string;
  readonly orgSlug: string;
  readonly orgName: string;
  readonly primaryColor?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML COMPONENT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an alert banner for the top of emails.
 * @param type - Alert type (info, success, warning, error)
 * @param message - Alert message text
 * @param brandColor - Optional brand color for info type border
 */
function alertBanner(type: AlertType, message: string, brandColor?: string): string {
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
function detailsTable(
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
function infoBlock(
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
function actionButton(text: string, url: string, brandColor: string): string {
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
 * Generate the email closing signature.
 * @param orgName - Organization name
 */
function signature(orgName: string): string {
  return `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">Best regards,<br><strong>${orgName}</strong></p>`;
}

/**
 * Generate greeting paragraph for user-facing emails.
 * @param userName - User's display name
 */
function greeting(userName: string): string {
  return `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear <strong>${escapeHtml(userName)}</strong>,</p>`;
}

/**
 * Generate a paragraph element.
 * @param text - Paragraph content (not escaped - may contain HTML)
 */
function paragraph(text: string): string {
  return `<p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">${text}</p>`;
}

/**
 * Generate heading element.
 * @param text - Heading content
 */
function heading(text: string): string {
  return `<h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">${text}</h2>`;
}

/**
 * Format asset display string.
 * @param brand - Asset brand (optional)
 * @param model - Asset model
 */
function formatAsset(brand: string | null, model: string): string {
  return `${brand || ''} ${model}`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Email sent to admins when an employee submits an asset request.
 *
 * @param data - Request submission data
 * @returns Email with subject, HTML, and plain text
 */
export function assetRequestSubmittedEmail(data: AssetRequestSubmittedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('info', 'New Asset Request Pending Your Approval', brandColor),
      heading('New Asset Request'),
      paragraph('An employee has requested an asset and requires your approval.'),
      detailsTable('Request Details', [
        ['Request Number', data.requestNumber],
        ['Requested By', `${escapeHtml(data.requesterName)} (${escapeHtml(data.requesterEmail)})`],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Asset Type', data.assetType],
      ], brandColor),
      infoBlock('Reason for Request', data.reason, 'info', brandColor),
      actionButton('Review Request', getTenantPortalUrl(data.orgSlug, '/admin/asset-requests'), brandColor),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
New Asset Request - ${data.requestNumber}

An employee has requested an asset and requires your approval.

Request Details:
- Request Number: ${data.requestNumber}
- Requested By: ${data.requesterName} (${data.requesterEmail})
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Asset Type: ${data.assetType}

Reason for Request:
${data.reason}

Review at: ${getTenantPortalUrl(data.orgSlug, '/admin/asset-requests')}`.trim();

  return {
    subject: `Asset Request: ${data.requesterName} - ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to user when admin assigns an asset pending acceptance.
 *
 * @param data - Assignment pending data
 * @returns Email with subject, HTML, and plain text
 */
export function assetAssignmentPendingEmail(data: AssetAssignmentPendingData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('warning', 'Action Required: Accept or Decline Asset Assignment'),
      heading('Asset Assignment Pending'),
      greeting(data.userName),
      paragraph(`An asset has been assigned to you by ${escapeHtml(data.assignerName)}. Please review and accept or decline.`),
      detailsTable('Asset Details', [
        ['Request Number', data.requestNumber],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Asset Type', data.assetType],
        ['Assigned By', escapeHtml(data.assignerName)],
      ], brandColor),
      data.reason ? infoBlock('Notes', data.reason, 'info', brandColor) : '',
      actionButton('Review Assignment', getTenantPortalUrl(data.orgSlug, '/employee/asset-requests'), brandColor),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Assignment Pending Your Acceptance

Dear ${data.userName},

An asset has been assigned to you by ${data.assignerName}.

Asset Details:
- Request Number: ${data.requestNumber}
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Asset Type: ${data.assetType}
${data.reason ? `\nNotes: ${data.reason}` : ''}

Review at: ${getTenantPortalUrl(data.orgSlug, '/employee/asset-requests')}`.trim();

  return {
    subject: `Asset Assignment Pending: ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to admins when user accepts an asset assignment.
 *
 * @param data - Assignment accepted data
 * @returns Email with subject, HTML, and plain text
 */
export function assetAssignmentAcceptedEmail(data: AssetAssignmentAcceptedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('success', 'Asset Assignment Accepted'),
      heading('Asset Assignment Accepted'),
      paragraph('The user has accepted the asset assignment. The asset is now in their custody.'),
      detailsTable('Details', [
        ['Request Number', data.requestNumber],
        ['Accepted By', `${escapeHtml(data.userName)} (${escapeHtml(data.userEmail)})`],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
      ], brandColor),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Assignment Accepted

The user has accepted the asset assignment. The asset is now in their custody.

Details:
- Request Number: ${data.requestNumber}
- Accepted By: ${data.userName} (${data.userEmail})
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}`.trim();

  return {
    subject: `Asset Accepted: ${data.userName} - ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to admins when user declines an asset assignment.
 *
 * @param data - Assignment declined data
 * @returns Email with subject, HTML, and plain text
 */
export function assetAssignmentDeclinedEmail(data: AssetAssignmentDeclinedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('error', 'Asset Assignment Declined'),
      heading('Asset Assignment Declined'),
      paragraph('The user has declined the asset assignment. The asset remains available.'),
      detailsTable('Details', [
        ['Request Number', data.requestNumber],
        ['Declined By', `${escapeHtml(data.userName)} (${escapeHtml(data.userEmail)})`],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
      ], brandColor),
      infoBlock('Reason', data.reason, 'error'),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Assignment Declined

The user has declined the asset assignment. The asset remains available.

Details:
- Request Number: ${data.requestNumber}
- Declined By: ${data.userName} (${data.userEmail})
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}

Reason: ${data.reason}`.trim();

  return {
    subject: `Asset Declined: ${data.userName} - ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to admins when user requests to return an asset.
 *
 * @param data - Return request data
 * @returns Email with subject, HTML, and plain text
 */
export function assetReturnRequestEmail(data: AssetReturnRequestData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('info', 'Asset Return Request Pending Your Approval', brandColor),
      heading('Asset Return Request'),
      paragraph('An employee is requesting to return an asset.'),
      detailsTable('Details', [
        ['Request Number', data.requestNumber],
        ['Requested By', `${escapeHtml(data.userName)} (${escapeHtml(data.userEmail)})`],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
      ], brandColor),
      infoBlock('Reason for Return', data.reason, 'info', brandColor),
      actionButton('Review Request', getTenantPortalUrl(data.orgSlug, '/admin/asset-requests'), brandColor),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Return Request - ${data.requestNumber}

An employee is requesting to return an asset.

Details:
- Request Number: ${data.requestNumber}
- Requested By: ${data.userName} (${data.userEmail})
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}

Reason: ${data.reason}

Review at: ${getTenantPortalUrl(data.orgSlug, '/admin/asset-requests')}`.trim();

  return {
    subject: `Asset Return Request: ${data.userName} - ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to user when admin approves their asset request.
 *
 * @param data - Request approved data
 * @returns Email with subject, HTML, and plain text
 */
export function assetRequestApprovedEmail(data: AssetRequestApprovedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('success', 'Your Asset Request Has Been Approved'),
      heading('Asset Request Approved'),
      greeting(data.userName),
      paragraph('Great news! Your asset request has been approved. The asset will be assigned to you shortly.'),
      detailsTable('Request Details', [
        ['Request Number', data.requestNumber],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Asset Type', data.assetType],
        ['Approved By', escapeHtml(data.approverName)],
      ], brandColor),
      actionButton('View My Requests', getTenantPortalUrl(data.orgSlug, '/employee/asset-requests'), brandColor),
      paragraph('You will receive a notification once the asset is ready for collection.'),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Request Approved

Dear ${data.userName},

Great news! Your asset request has been approved. The asset will be assigned to you shortly.

Request Details:
- Request Number: ${data.requestNumber}
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Asset Type: ${data.assetType}
- Approved By: ${data.approverName}

You will receive a notification once the asset is ready for collection.

View at: ${getTenantPortalUrl(data.orgSlug, '/employee/asset-requests')}`.trim();

  return {
    subject: `Asset Request Approved: ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to user when admin rejects their asset request.
 *
 * @param data - Request rejected data
 * @returns Email with subject, HTML, and plain text
 */
export function assetRequestRejectedEmail(data: AssetRequestRejectedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('error', 'Asset Request Rejected'),
      heading('Asset Request Rejected'),
      greeting(data.userName),
      paragraph('Unfortunately, your asset request has been rejected.'),
      detailsTable('Request Details', [
        ['Request Number', data.requestNumber],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Rejected By', escapeHtml(data.rejectorName)],
      ], brandColor),
      infoBlock('Reason', data.reason, 'error'),
      paragraph('If you have questions, please contact IT support.'),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Request Rejected

Dear ${data.userName},

Unfortunately, your asset request has been rejected.

Request Details:
- Request Number: ${data.requestNumber}
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Rejected By: ${data.rejectorName}

Reason: ${data.reason}

If you have questions, please contact IT support.`.trim();

  return {
    subject: `Asset Request Rejected: ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to user when admin approves their return request.
 *
 * @param data - Return approved data
 * @returns Email with subject, HTML, and plain text
 */
export function assetReturnApprovedEmail(data: AssetReturnApprovedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('success', 'Asset Return Approved'),
      heading('Asset Return Approved'),
      greeting(data.userName),
      paragraph('Your request to return the asset has been approved. The asset has been removed from your custody.'),
      detailsTable('Details', [
        ['Request Number', data.requestNumber],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Approved By', escapeHtml(data.approverName)],
      ], brandColor),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Return Approved

Dear ${data.userName},

Your request to return the asset has been approved. The asset has been removed from your custody.

Details:
- Request Number: ${data.requestNumber}
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Approved By: ${data.approverName}`.trim();

  return {
    subject: `Asset Return Approved: ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to user when admin rejects their return request.
 *
 * @param data - Return rejected data
 * @returns Email with subject, HTML, and plain text
 */
export function assetReturnRejectedEmail(data: AssetReturnRejectedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('error', 'Asset Return Request Rejected'),
      heading('Asset Return Request Rejected'),
      greeting(data.userName),
      paragraph('Your request to return the asset has been rejected. Please continue to maintain custody of this asset.'),
      detailsTable('Request Details', [
        ['Request Number', data.requestNumber],
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Rejected By', escapeHtml(data.rejectorName)],
      ], brandColor),
      infoBlock('Reason', data.reason, 'error'),
      paragraph('If you have questions, please contact IT support.'),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Return Request Rejected

Dear ${data.userName},

Your request to return the asset has been rejected. Please continue to maintain custody of this asset.

Request Details:
- Request Number: ${data.requestNumber}
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Rejected By: ${data.rejectorName}

Reason: ${data.reason}

If you have questions, please contact IT support.`.trim();

  return {
    subject: `Asset Return Rejected: ${asset}`,
    html,
    text,
  };
}

/**
 * Email sent to user when admin directly unassigns an asset from them.
 *
 * @param data - Unassignment data
 * @returns Email with subject, HTML, and plain text
 */
export function assetUnassignedEmail(data: AssetUnassignedData): EmailResult {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const asset = formatAsset(data.assetBrand, data.assetModel);

  const html = emailWrapper(
    [
      alertBanner('info', 'Asset Removed From Your Custody', brandColor),
      heading('Asset Unassigned'),
      greeting(data.userName),
      paragraph('An asset has been unassigned from you and removed from your custody.'),
      detailsTable('Asset Details', [
        ['Asset', asset],
        ['Asset Tag', data.assetTag || 'N/A'],
        ['Asset Type', data.assetType],
        ['Unassigned By', escapeHtml(data.adminName)],
      ], brandColor),
      data.reason ? infoBlock('Reason', data.reason, 'info', brandColor) : '',
      paragraph('You are no longer responsible for this asset. If you have questions, please contact IT support.'),
      signature(data.orgName),
    ].join(''),
    data.orgName,
    brandColor
  );

  const text = `
Asset Unassigned

Dear ${data.userName},

An asset has been unassigned from you and removed from your custody.

Asset Details:
- Asset: ${asset}
- Asset Tag: ${data.assetTag || 'N/A'}
- Asset Type: ${data.assetType}
- Unassigned By: ${data.adminName}
${data.reason ? `\nReason: ${data.reason}` : ''}

You are no longer responsible for this asset. If you have questions, please contact IT support.`.trim();

  return {
    subject: `Asset Unassigned: ${asset}`,
    html,
    text,
  };
}
