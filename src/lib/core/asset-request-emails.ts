// Asset Request Email Templates
// Brand color: #73c5d1

const BRAND_COLOR = '#73c5d1';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

/**
 * Get tenant-specific portal URL
 * @param orgSlug - Organization slug for subdomain
 * @param path - Optional path to append (e.g., '/admin', '/employee')
 */
function getTenantPortalUrl(orgSlug: string, path: string = ''): string {
  const isLocalhost = APP_DOMAIN.includes('localhost');
  const protocol = isLocalhost ? 'http' : 'https';
  return `${protocol}://${orgSlug}.${APP_DOMAIN}${path}`;
}

function formatTimestamp(): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: 'Asia/Qatar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function emailWrapper(content: string): string {
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
      <td style="background-color: ${BRAND_COLOR}; padding: 30px 40px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">Be Creative Portal</h1>
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
          This is an automated message from Be Creative Portal.
        </p>
        <p style="color: #888888; font-size: 12px; margin: 0;">
          Generated on ${formatTimestamp()}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

interface AssetRequestEmailData {
  requestNumber: string;
  assetTag: string | null;
  assetModel: string;
  assetBrand: string | null;
  assetType: string;
  orgSlug: string;
}

// Employee submits asset request -> Admin notification
interface AssetRequestSubmittedData extends AssetRequestEmailData {
  requesterName: string;
  requesterEmail: string;
  reason: string;
}

export function assetRequestSubmittedEmail(data: AssetRequestSubmittedData): { subject: string; html: string; text: string } {
  const subject = `Asset Request: ${data.requesterName} - ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${BRAND_COLOR}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #0c5460; font-size: 14px; margin: 0; font-weight: bold;">
            New Asset Request Pending Your Approval
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Asset Request</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      An employee has requested an asset and requires your approval.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Requested By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.requesterName} (${data.requesterEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Type:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetType}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${BRAND_COLOR}; margin: 0 0 10px 0; font-size: 14px;">Reason for Request:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${data.reason}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/asset-requests')}" style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br><strong>Be Creative Portal</strong>
    </p>
  `);

  const text = `
New Asset Request - ${data.requestNumber}

An employee has requested an asset and requires your approval.

Request Details:
- Request Number: ${data.requestNumber}
- Requested By: ${data.requesterName} (${data.requesterEmail})
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}
- Asset Type: ${data.assetType}

Reason for Request:
${data.reason}

Review at: ${getTenantPortalUrl(data.orgSlug, '/admin/asset-requests')}
`.trim();

  return { subject, html, text };
}

// Admin assigns asset to user -> User notification
interface AssetAssignmentPendingData extends AssetRequestEmailData {
  userName: string;
  assignerName: string;
  reason?: string;
}

export function assetAssignmentPendingEmail(data: AssetAssignmentPendingData): { subject: string; html: string; text: string } {
  const subject = `Asset Assignment Pending: ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
            Action Required: Accept or Decline Asset Assignment
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Assignment Pending</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      An asset has been assigned to you by ${data.assignerName}. Please review and accept or decline.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Asset Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Type:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Assigned By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assignerName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${data.reason ? `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${BRAND_COLOR}; margin: 0 0 10px 0; font-size: 14px;">Notes:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${data.reason}</p>
        </td>
      </tr>
    </table>
    ` : ''}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/employee/asset-requests')}" style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Assignment
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br><strong>Be Creative IT Team</strong>
    </p>
  `);

  const text = `
Asset Assignment Pending Your Acceptance

Dear ${data.userName},

An asset has been assigned to you by ${data.assignerName}.

Asset Details:
- Request Number: ${data.requestNumber}
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}
- Asset Type: ${data.assetType}
${data.reason ? `\nNotes: ${data.reason}` : ''}

Review at: ${getTenantPortalUrl(data.orgSlug, '/employee/asset-requests')}
`.trim();

  return { subject, html, text };
}

// User accepts assignment -> Admin notification
interface AssetAssignmentAcceptedData extends AssetRequestEmailData {
  userName: string;
  userEmail: string;
}

export function assetAssignmentAcceptedEmail(data: AssetAssignmentAcceptedData): { subject: string; html: string; text: string } {
  const subject = `Asset Accepted: ${data.userName} - ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #dcfce7; border-left: 4px solid #22c55e; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #15803d; font-size: 14px; margin: 0; font-weight: bold;">Asset Assignment Accepted</p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Assignment Accepted</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      The user has accepted the asset assignment. The asset is now in their custody.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Accepted By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.userName} (${data.userEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br><strong>Be Creative Portal</strong>
    </p>
  `);

  const text = `
Asset Assignment Accepted

The user has accepted the asset assignment. The asset is now in their custody.

Details:
- Request Number: ${data.requestNumber}
- Accepted By: ${data.userName} (${data.userEmail})
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}
`.trim();

  return { subject, html, text };
}

// User declines assignment -> Admin notification
interface AssetAssignmentDeclinedData extends AssetRequestEmailData {
  userName: string;
  userEmail: string;
  reason: string;
}

export function assetAssignmentDeclinedEmail(data: AssetAssignmentDeclinedData): { subject: string; html: string; text: string } {
  const subject = `Asset Declined: ${data.userName} - ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #dc2626; font-size: 14px; margin: 0; font-weight: bold;">Asset Assignment Declined</p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Assignment Declined</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      The user has declined the asset assignment. The asset remains available.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Declined By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.userName} (${data.userEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: #dc2626; margin: 0 0 10px 0; font-size: 14px;">Reason:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${data.reason}</p>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br><strong>Be Creative Portal</strong>
    </p>
  `);

  const text = `
Asset Assignment Declined

The user has declined the asset assignment. The asset remains available.

Details:
- Request Number: ${data.requestNumber}
- Declined By: ${data.userName} (${data.userEmail})
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}

Reason: ${data.reason}
`.trim();

  return { subject, html, text };
}

// User requests return -> Admin notification
interface AssetReturnRequestData extends AssetRequestEmailData {
  userName: string;
  userEmail: string;
  reason: string;
}

export function assetReturnRequestEmail(data: AssetReturnRequestData): { subject: string; html: string; text: string } {
  const subject = `Asset Return Request: ${data.userName} - ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${BRAND_COLOR}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #0c5460; font-size: 14px; margin: 0; font-weight: bold;">
            Asset Return Request Pending Your Approval
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Return Request</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      An employee is requesting to return an asset.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Requested By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.userName} (${data.userEmail})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${BRAND_COLOR}; margin: 0 0 10px 0; font-size: 14px;">Reason for Return:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${data.reason}</p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/asset-requests')}" style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br><strong>Be Creative Portal</strong>
    </p>
  `);

  const text = `
Asset Return Request - ${data.requestNumber}

An employee is requesting to return an asset.

Details:
- Request Number: ${data.requestNumber}
- Requested By: ${data.userName} (${data.userEmail})
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}

Reason: ${data.reason}

Review at: ${getTenantPortalUrl(data.orgSlug, '/admin/asset-requests')}
`.trim();

  return { subject, html, text };
}

// Admin rejects employee request -> User notification
interface AssetRequestRejectedData extends AssetRequestEmailData {
  userName: string;
  rejectorName: string;
  reason: string;
}

export function assetRequestRejectedEmail(data: AssetRequestRejectedData): { subject: string; html: string; text: string } {
  const subject = `Asset Request Rejected: ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #dc2626; font-size: 14px; margin: 0; font-weight: bold;">Asset Request Rejected</p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Request Rejected</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Unfortunately, your asset request has been rejected.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Rejected By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.rejectorName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: #dc2626; margin: 0 0 10px 0; font-size: 14px;">Reason:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${data.reason}</p>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      If you have questions, please contact IT support.<br><br>
      Best regards,<br><strong>Be Creative IT Team</strong>
    </p>
  `);

  const text = `
Asset Request Rejected

Dear ${data.userName},

Unfortunately, your asset request has been rejected.

Request Details:
- Request Number: ${data.requestNumber}
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}
- Rejected By: ${data.rejectorName}

Reason: ${data.reason}

If you have questions, please contact IT support.
`.trim();

  return { subject, html, text };
}

// Admin rejects return request -> User notification
interface AssetReturnRejectedData extends AssetRequestEmailData {
  userName: string;
  rejectorName: string;
  reason: string;
}

export function assetReturnRejectedEmail(data: AssetReturnRejectedData): { subject: string; html: string; text: string } {
  const subject = `Asset Return Rejected: ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #dc2626; font-size: 14px; margin: 0; font-weight: bold;">Asset Return Request Rejected</p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Return Request Rejected</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your request to return the asset has been rejected. Please continue to maintain custody of this asset.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Rejected By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.rejectorName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fee2e2; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: #dc2626; margin: 0 0 10px 0; font-size: 14px;">Reason:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${data.reason}</p>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      If you have questions, please contact IT support.<br><br>
      Best regards,<br><strong>Be Creative IT Team</strong>
    </p>
  `);

  const text = `
Asset Return Request Rejected

Dear ${data.userName},

Your request to return the asset has been rejected. Please continue to maintain custody of this asset.

Request Details:
- Request Number: ${data.requestNumber}
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}
- Rejected By: ${data.rejectorName}

Reason: ${data.reason}

If you have questions, please contact IT support.
`.trim();

  return { subject, html, text };
}

// Admin approves return -> User notification
interface AssetReturnApprovedData extends AssetRequestEmailData {
  userName: string;
  approverName: string;
}

export function assetReturnApprovedEmail(data: AssetReturnApprovedData): { subject: string; html: string; text: string } {
  const subject = `Asset Return Approved: ${data.assetBrand || ''} ${data.assetModel}`;

  const html = emailWrapper(`
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #dcfce7; border-left: 4px solid #22c55e; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #15803d; font-size: 14px; margin: 0; font-weight: bold;">Asset Return Approved</p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Return Approved</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your request to return the asset has been approved. The asset has been removed from your custody.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetBrand || ''} ${data.assetModel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetTag || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Approved By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.approverName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br><strong>Be Creative IT Team</strong>
    </p>
  `);

  const text = `
Asset Return Approved

Dear ${data.userName},

Your request to return the asset has been approved. The asset has been removed from your custody.

Details:
- Request Number: ${data.requestNumber}
- Asset: ${data.assetBrand || ''} ${data.assetModel}
- Asset Tag: ${data.assetTag || 'N/A'}
- Approved By: ${data.approverName}
`.trim();

  return { subject, html, text };
}
