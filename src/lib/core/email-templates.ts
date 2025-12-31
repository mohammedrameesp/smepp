// Email Templates for Durj
// Brand color: #3B82F6 (blue-500)

const BRAND_COLOR = '#3B82F6';
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

/**
 * Get tenant-specific portal URL
 * @param orgSlug - Organization slug for subdomain
 * @param path - Optional path to append (e.g., '/admin', '/profile')
 */
function getTenantPortalUrl(orgSlug: string, path: string = ''): string {
  const isLocalhost = APP_DOMAIN.includes('localhost');
  const protocol = isLocalhost ? 'http' : 'https';
  return `${protocol}://${orgSlug}.${APP_DOMAIN}${path}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimestamp(timezone: string = 'Asia/Qatar'): string {
  return new Date().toLocaleString('en-GB', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// BASE EMAIL WRAPPER
// ============================================================================

function emailWrapper(content: string, orgName: string, timezone?: string): string {
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

// ============================================================================
// SUPPLIER APPROVAL EMAIL
// ============================================================================

interface SupplierApprovalData {
  companyName: string;
  serviceCategory: string;
  approvalDate: Date;
  orgName: string;
}

export function supplierApprovalEmail(data: SupplierApprovalData): { subject: string; html: string; text: string } {
  const subject = `Supplier Registration Approved - ${data.companyName}`;

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Congratulations! Your Supplier Registration is Approved</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.companyName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      We are pleased to inform you that your supplier registration with ${data.orgName} has been approved. You are now an approved vendor in our system.
    </p>

    <!-- Supplier Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Your Supplier Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Company Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Service Category:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.serviceCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Approval Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.approvalDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>What's Next?</strong>
    </p>

    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
      <li>You may be contacted by our procurement team for future engagements</li>
      <li>Please keep your contact information up to date</li>
      <li>Maintain proper documentation for all business transactions</li>
    </ul>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Thank you for partnering with ${data.orgName}. We look forward to working with you.
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} Procurement Team</strong>
    </p>
  `, data.orgName);

  const text = `
Congratulations! Your Supplier Registration is Approved

Dear ${data.companyName},

We are pleased to inform you that your supplier registration with ${data.orgName} has been approved.

Your Supplier Details:
- Company Name: ${data.companyName}
- Service Category: ${data.serviceCategory}
- Approval Date: ${formatDate(data.approvalDate)}

What's Next?
- You may be contacted by our procurement team for future engagements
- Please keep your contact information up to date
- Maintain proper documentation for all business transactions

Thank you for partnering with ${data.orgName}. We look forward to working with you.

Best regards,
${data.orgName} Procurement Team
`.trim();

  return { subject, html, text };
}

// ============================================================================
// ASSET ASSIGNMENT EMAIL
// ============================================================================

interface AssetAssignmentData {
  userName: string;
  assetTag: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  assignmentDate: Date;
  orgName: string;
}

export function assetAssignmentEmail(data: AssetAssignmentData): { subject: string; html: string; text: string } {
  const subject = `Asset Assigned: ${data.assetTag} - ${data.brand} ${data.model}`;

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Assignment Notification</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new asset has been assigned to you. Please review the details below and acknowledge receipt of this equipment.
    </p>

    <!-- Asset Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Asset Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Asset Tag:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.assetTag}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Asset Type:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.assetType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Brand / Model:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.brand} ${data.model}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Serial Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.serialNumber || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Assignment Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.assignmentDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>Your Responsibilities:</strong>
    </p>

    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Take care of the assigned asset and use it responsibly</li>
      <li>Report any damage or issues immediately to IT support</li>
      <li>Do not transfer this asset to another person without authorization</li>
      <li>Return the asset when requested or upon leaving the company</li>
    </ul>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      You can view all your assigned assets by logging into the portal and navigating to "My Assets".
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} IT Team</strong>
    </p>
  `, data.orgName);

  const text = `
Asset Assignment Notification

Dear ${data.userName},

A new asset has been assigned to you.

Asset Details:
- Asset Tag: ${data.assetTag}
- Asset Type: ${data.assetType}
- Brand / Model: ${data.brand} ${data.model}
- Serial Number: ${data.serialNumber || 'N/A'}
- Assignment Date: ${formatDate(data.assignmentDate)}

Your Responsibilities:
- Take care of the assigned asset and use it responsibly
- Report any damage or issues immediately to IT support
- Do not transfer this asset to another person without authorization
- Return the asset when requested or upon leaving the company

You can view all your assigned assets in the portal under "My Assets".

Best regards,
${data.orgName} IT Team
`.trim();

  return { subject, html, text };
}

// ============================================================================
// PROFILE CHANGE REQUEST EMAIL (To Admins)
// ============================================================================

interface ChangeRequestData {
  employeeName: string;
  employeeEmail: string;
  fieldName: string;
  currentValue: string;
  requestedValue: string;
  reason: string;
  submittedDate: Date;
  orgSlug: string;
  orgName: string;
}

export function changeRequestEmail(data: ChangeRequestData): { subject: string; html: string; text: string } {
  const subject = `Profile Change Request: ${data.employeeName} - ${data.fieldName}`;

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
            Action Required: Profile Change Request
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Profile Change Request</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      An employee has submitted a profile change request that requires your review.
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Employee Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.employeeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Employee Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.employeeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Field to Change:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.fieldName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Current Value:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.currentValue || 'Not set'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Requested Value:</td>
              <td style="padding: 8px 0; color: ${BRAND_COLOR}; font-size: 14px; font-weight: bold;">${data.requestedValue}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Submitted On:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.submittedDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Reason Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${BRAND_COLOR}; margin: 0 0 10px 0; font-size: 14px;">Reason for Change:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            ${data.reason || 'No reason provided'}
          </p>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Please log in to the portal to review and approve or reject this request.
    </p>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/employees')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName);

  const text = `
Profile Change Request - Action Required

An employee has submitted a profile change request that requires your review.

Request Details:
- Employee Name: ${data.employeeName}
- Employee Email: ${data.employeeEmail}
- Field to Change: ${data.fieldName}
- Current Value: ${data.currentValue || 'Not set'}
- Requested Value: ${data.requestedValue}
- Submitted On: ${formatDate(data.submittedDate)}

Reason for Change:
${data.reason || 'No reason provided'}

Please log in to the portal to review and approve or reject this request.
${getTenantPortalUrl(data.orgSlug, '/admin/employees')}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// WELCOME USER EMAIL
// ============================================================================

interface WelcomeUserData {
  userName: string;
  userEmail: string;
  userRole: string;
  orgSlug: string;
  orgName: string;
  authMethods: {
    hasGoogle: boolean;
    hasMicrosoft: boolean;
    hasPassword: boolean;
  };
}

export function welcomeUserEmail(data: WelcomeUserData): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${data.orgName} - ${data.userName}`;

  // Format role for display
  const roleDisplay = data.userRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Get tenant-specific portal URL
  const portalUrl = getTenantPortalUrl(data.orgSlug, '/login');

  // Build sign-in instruction based on auth methods
  const signInMethods: string[] = [];
  if (data.authMethods.hasGoogle) {
    signInMethods.push('Sign in using your Google account');
  }
  if (data.authMethods.hasMicrosoft) {
    signInMethods.push('Sign in using your Microsoft account');
  }
  if (data.authMethods.hasPassword) {
    signInMethods.push('Sign in using your email and password');
  }
  // Fallback if no methods specified
  if (signInMethods.length === 0) {
    signInMethods.push('Sign in using your email and password');
  }

  const signInInstructionsHtml = signInMethods.map(m => `<li>${m}</li>`).join('\n      ');
  const signInInstructionsText = signInMethods.map(m => `- ${m}`).join('\n');

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Welcome to ${data.orgName}!</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your account has been created on the ${data.orgName} Portal. You can now access the system using your company email address.
    </p>

    <!-- Account Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Your Account Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Role:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${roleDisplay}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>Getting Started:</strong>
    </p>

    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
      ${signInInstructionsHtml}
      <li>Complete your HR profile with personal and emergency contact information</li>
      <li>View your assigned assets and subscriptions</li>
      <li>Keep your documents up to date (QID, Passport, Health Card)</li>
    </ul>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${portalUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Access Portal
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      If you have any questions or need assistance, please contact the IT support team.
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Welcome aboard!<br>
      <strong>${data.orgName} Team</strong>
    </p>
  `, data.orgName);

  const text = `
Welcome to ${data.orgName}!

Dear ${data.userName},

Your account has been created on the ${data.orgName} Portal.

Your Account Details:
- Name: ${data.userName}
- Email: ${data.userEmail}
- Role: ${roleDisplay}

Getting Started:
${signInInstructionsText}
- Complete your HR profile with personal and emergency contact information
- View your assigned assets and subscriptions
- Keep your documents up to date (QID, Passport, Health Card)

Access the portal at: ${portalUrl}

If you have any questions or need assistance, please contact the IT support team.

Welcome aboard!
${data.orgName} Team
`.trim();

  return { subject, html, text };
}

// ============================================================================
// WELCOME EMAIL WITH PASSWORD SETUP
// For new employees in organizations using email/password authentication
// ============================================================================

interface WelcomeUserWithPasswordSetupData {
  userName: string;
  userEmail: string;
  userRole: string;
  orgSlug: string;
  orgName: string;
  setupToken: string;
}

export function welcomeUserWithPasswordSetupEmail(data: WelcomeUserWithPasswordSetupData): { subject: string; html: string; text: string } {
  const subject = `Welcome! Set Up Your Password - ${data.orgName}`;

  // Format role for display
  const roleDisplay = data.userRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Get tenant-specific password setup URL
  const setupUrl = getTenantPortalUrl(data.orgSlug, `/set-password/${data.setupToken}`);

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Welcome to ${data.orgName}!</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your account has been created on the ${data.orgName} Portal. To get started, please set up your password using the link below.
    </p>

    <!-- Account Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Your Account Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Role:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${roleDisplay}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${setupUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Set Your Password
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
      This link will expire in 7 days.
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>After setting your password, you can:</strong>
    </p>

    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Sign in using your email and password</li>
      <li>Complete your HR profile with personal and emergency contact information</li>
      <li>View your assigned assets and subscriptions</li>
      <li>Keep your documents up to date (QID, Passport, Health Card)</li>
    </ul>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      If you have any questions or need assistance, please contact the IT support team.
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Welcome aboard!<br>
      <strong>${data.orgName} Team</strong>
    </p>
  `, data.orgName);

  const text = `
Welcome to ${data.orgName}!

Dear ${data.userName},

Your account has been created on the ${data.orgName} Portal. To get started, please set up your password.

Your Account Details:
- Name: ${data.userName}
- Email: ${data.userEmail}
- Role: ${roleDisplay}

Set your password here: ${setupUrl}

This link will expire in 7 days.

After setting your password, you can:
- Sign in using your email and password
- Complete your HR profile with personal and emergency contact information
- View your assigned assets and subscriptions
- Keep your documents up to date (QID, Passport, Health Card)

If you have any questions or need assistance, please contact the IT support team.

Welcome aboard!
${data.orgName} Team
`.trim();

  return { subject, html, text };
}

// ============================================================================
// DOCUMENT EXPIRY ALERT EMAIL
// ============================================================================

interface ExpiringDocument {
  name: string;
  expiryDate: Date;
  daysRemaining: number;
  status: 'expired' | 'expiring';
}

interface DocumentExpiryAlertData {
  userName: string;
  documents: ExpiringDocument[];
  orgSlug: string;
  orgName: string;
}

export function documentExpiryAlertEmail(data: DocumentExpiryAlertData): { subject: string; html: string; text: string } {
  const expiredCount = data.documents.filter((d) => d.status === 'expired').length;
  const expiringCount = data.documents.filter((d) => d.status === 'expiring').length;

  let subjectPrefix = '';
  if (expiredCount > 0 && expiringCount > 0) {
    subjectPrefix = `${expiredCount} Expired, ${expiringCount} Expiring Soon`;
  } else if (expiredCount > 0) {
    subjectPrefix = `${expiredCount} Document(s) Expired`;
  } else {
    subjectPrefix = `${expiringCount} Document(s) Expiring Soon`;
  }

  const subject = `Document Alert: ${subjectPrefix}`;

  const documentRows = data.documents
    .map((doc) => {
      const isExpired = doc.status === 'expired';
      const bgColor = isExpired ? '#fef2f2' : '#fffbeb';
      const borderColor = isExpired ? '#dc3545' : '#ffc107';
      const badgeColor = isExpired ? '#dc3545' : '#ffc107';
      const statusText = isExpired ? 'EXPIRED' : 'EXPIRING';
      const daysText = isExpired
        ? `Expired ${Math.abs(doc.daysRemaining)} days ago`
        : `${doc.daysRemaining} days remaining`;
      const daysColor = isExpired ? '#dc3545' : '#856404';

      return `
        <tr>
          <td style="padding: 0 0 15px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor};">
              <tr>
                <td style="padding: 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="color: #333333; font-size: 16px; font-weight: bold;">${doc.name}</td>
                      <td align="right">
                        <span style="display: inline-block; padding: 4px 12px; background-color: ${badgeColor}; color: #ffffff; font-size: 12px; border-radius: 12px; font-weight: bold;">
                          ${statusText}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding-top: 10px;">
                        <span style="color: #666666; font-size: 14px;">Expiry Date: </span>
                        <span style="color: #333333; font-size: 14px; font-weight: bold;">${formatDate(doc.expiryDate)}</span>
                        <span style="color: ${daysColor}; font-size: 14px; margin-left: 10px;">${daysText}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
            Action Required: Document(s) Expiring Soon
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Document Expiry Reminder</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      This is a reminder that the following document(s) in your profile are expiring soon or have already expired. Please take action to renew them.
    </p>

    <!-- Expiring Documents List -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      ${documentRows}
    </table>

    <!-- Color Legend -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #666666; font-size: 12px; margin: 0;">
            <span style="display: inline-block; width: 12px; height: 12px; background-color: #dc3545; border-radius: 50%; margin-right: 5px; vertical-align: middle;"></span> Expired
            <span style="margin-left: 15px; display: inline-block; width: 12px; height: 12px; background-color: #ffc107; border-radius: 50%; margin-right: 5px; vertical-align: middle;"></span> Expiring Soon (within 30 days)
          </p>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>What to do:</strong>
    </p>

    <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Renew your expired or expiring documents as soon as possible</li>
      <li>Upload the new document copies to your profile in the portal</li>
      <li>Contact HR if you need any assistance with the renewal process</li>
    </ul>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/profile')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Update My Profile
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} HR Team</strong>
    </p>
  `, data.orgName);

  const documentListText = data.documents
    .map((doc) => {
      const daysText =
        doc.status === 'expired'
          ? `EXPIRED (${Math.abs(doc.daysRemaining)} days ago)`
          : `EXPIRING (${doc.daysRemaining} days remaining)`;
      return `- ${doc.name}: ${formatDate(doc.expiryDate)} - ${daysText}`;
    })
    .join('\n');

  const text = `
Document Expiry Reminder - Action Required

Dear ${data.userName},

This is a reminder that the following document(s) are expiring soon or have already expired:

${documentListText}

What to do:
- Renew your expired or expiring documents as soon as possible
- Upload the new document copies to your profile in the portal
- Contact HR if you need any assistance with the renewal process

Update your profile at: ${getTenantPortalUrl(data.orgSlug, '/profile')}

Best regards,
${data.orgName} HR Team
`.trim();

  return { subject, html, text };
}

// ============================================================================
// ADMIN CONSOLIDATED DOCUMENT EXPIRY ALERT EMAIL
// ============================================================================

interface EmployeeExpiringDocument {
  employeeName: string;
  employeeEmail: string;
  documentName: string;
  expiryDate: Date;
  daysRemaining: number;
  status: 'expired' | 'expiring';
}

interface AdminDocumentExpiryAlertData {
  documents: EmployeeExpiringDocument[];
  totalEmployees: number;
  expiredCount: number;
  expiringCount: number;
  orgSlug: string;
  orgName: string;
}

export function adminDocumentExpiryAlertEmail(data: AdminDocumentExpiryAlertData): { subject: string; html: string; text: string } {
  const subject = `Document Expiry Summary: ${data.expiredCount} Expired, ${data.expiringCount} Expiring Soon`;

  // Group documents by employee for better readability
  const employeeMap = new Map<string, EmployeeExpiringDocument[]>();
  for (const doc of data.documents) {
    const key = doc.employeeEmail;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, []);
    }
    employeeMap.get(key)!.push(doc);
  }

  const documentRows = Array.from(employeeMap.entries())
    .map(([, docs]) => {
      const employee = docs[0];
      const hasExpired = docs.some(d => d.status === 'expired');
      const bgColor = hasExpired ? '#fef2f2' : '#fffbeb';
      const borderColor = hasExpired ? '#dc3545' : '#ffc107';

      const docList = docs.map(doc => {
        const isExpired = doc.status === 'expired';
        const badgeColor = isExpired ? '#dc3545' : '#ffc107';
        const statusText = isExpired ? 'EXPIRED' : 'EXPIRING';
        const daysText = isExpired
          ? `${Math.abs(doc.daysRemaining)} days ago`
          : `${doc.daysRemaining} days`;

        return `
          <tr>
            <td style="padding: 5px 0; color: #555555; font-size: 13px;">
              ${doc.documentName}: ${formatDate(doc.expiryDate)}
              <span style="display: inline-block; padding: 2px 8px; background-color: ${badgeColor}; color: #ffffff; font-size: 10px; border-radius: 10px; margin-left: 8px;">
                ${statusText} (${daysText})
              </span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <tr>
          <td style="padding: 0 0 15px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor};">
              <tr>
                <td style="padding: 15px 20px;">
                  <div style="font-weight: bold; color: #333333; font-size: 14px; margin-bottom: 8px;">
                    ${employee.employeeName}
                  </div>
                  <div style="color: #666666; font-size: 12px; margin-bottom: 10px;">
                    ${employee.employeeEmail}
                  </div>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${docList}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
            Document Expiry Alert - ${data.totalEmployees} Employee(s) Affected
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Employee Document Expiry Summary</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      The following employees have documents that are expiring soon or have already expired:
    </p>

    <!-- Summary Stats -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px; background-color: #fee2e2; border-radius: 8px; text-align: center; width: 48%;">
          <div style="font-size: 28px; font-weight: bold; color: #dc3545;">${data.expiredCount}</div>
          <div style="font-size: 12px; color: #dc3545;">Expired</div>
        </td>
        <td style="width: 4%;"></td>
        <td style="padding: 15px; background-color: #fef3c7; border-radius: 8px; text-align: center; width: 48%;">
          <div style="font-size: 28px; font-weight: bold; color: #d97706;">${data.expiringCount}</div>
          <div style="font-size: 12px; color: #d97706;">Expiring Soon</div>
        </td>
      </tr>
    </table>

    <!-- Employee List -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      ${documentRows}
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/employees/document-expiry')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View All Expiring Documents
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName);

  const employeeList = Array.from(employeeMap.entries())
    .map(([, docs]) => {
      const employee = docs[0];
      const docLines = docs.map(doc => {
        const isExpired = doc.status === 'expired';
        const statusText = isExpired ? 'EXPIRED' : 'EXPIRING';
        const daysText = isExpired
          ? `${Math.abs(doc.daysRemaining)} days ago`
          : `${doc.daysRemaining} days remaining`;
        return `  - ${doc.documentName}: ${formatDate(doc.expiryDate)} (${statusText} - ${daysText})`;
      }).join('\n');
      return `${employee.employeeName} (${employee.employeeEmail}):\n${docLines}`;
    })
    .join('\n\n');

  const text = `
Employee Document Expiry Summary

${data.totalEmployees} employee(s) have documents expiring or expired:
- Expired: ${data.expiredCount}
- Expiring Soon: ${data.expiringCount}

${employeeList}

View all expiring documents at: ${getTenantPortalUrl(data.orgSlug, '/admin/employees/document-expiry')}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// NEW SUPPLIER REGISTRATION EMAIL (To Admins)
// ============================================================================

interface NewSupplierRegistrationData {
  companyName: string;
  category: string;
  contactName: string | null;
  contactEmail: string | null;
  country: string | null;
  registrationDate: Date;
  orgSlug: string;
  orgName: string;
}

export function newSupplierRegistrationEmail(data: NewSupplierRegistrationData): { subject: string; html: string; text: string } {
  const subject = `New Supplier Registration: ${data.companyName}`;

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${BRAND_COLOR}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #0c5460; font-size: 14px; margin: 0; font-weight: bold;">
            New Supplier Registration Pending Review
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Supplier Registration</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new supplier has registered on the ${data.orgName} Portal and is pending your approval.
    </p>

    <!-- Supplier Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Supplier Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Company Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Category:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Contact Person:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.contactName || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Contact Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.contactEmail || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Country:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.country || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Registration Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.registrationDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Please review this registration and approve or reject it as appropriate.
    </p>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/suppliers')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Supplier
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName);

  const text = `
New Supplier Registration - Pending Review

A new supplier has registered on the ${data.orgName} Portal and is pending your approval.

Supplier Details:
- Company Name: ${data.companyName}
- Category: ${data.category}
- Contact Person: ${data.contactName || 'Not provided'}
- Contact Email: ${data.contactEmail || 'Not provided'}
- Country: ${data.country || 'Not provided'}
- Registration Date: ${formatDate(data.registrationDate)}

Please log in to the portal to review and approve or reject this registration.
${getTenantPortalUrl(data.orgSlug, '/admin/suppliers')}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// PURCHASE REQUEST SUBMITTED EMAIL (To Admins)
// ============================================================================

interface PurchaseRequestSubmittedData {
  referenceNumber: string;
  requesterName: string;
  title: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  priority: string;
  orgSlug: string;
  orgName: string;
}

export function purchaseRequestSubmittedEmail(data: PurchaseRequestSubmittedData): { subject: string; html: string; text: string } {
  const subject = `New Purchase Request: ${data.referenceNumber} - ${data.title}`;

  // Format priority for display
  const priorityColors: Record<string, { bg: string; text: string }> = {
    LOW: { bg: '#e5e7eb', text: '#374151' },
    MEDIUM: { bg: '#dbeafe', text: '#1e40af' },
    HIGH: { bg: '#ffedd5', text: '#c2410c' },
    URGENT: { bg: '#fee2e2', text: '#dc2626' },
  };
  const priorityColor = priorityColors[data.priority] || priorityColors.MEDIUM;
  const priorityLabel = data.priority.charAt(0) + data.priority.slice(1).toLowerCase();

  // Format currency
  const formattedAmount = new Intl.NumberFormat('en-QA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(data.totalAmount);

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${BRAND_COLOR}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #0c5460; font-size: 14px; margin: 0; font-weight: bold;">
            New Purchase Request Submitted
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Purchase Request</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new purchase request has been submitted and requires your review.
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Reference Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.referenceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Title:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Requested By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.requesterName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="display: inline-block; padding: 4px 12px; background-color: ${priorityColor.bg}; color: ${priorityColor.text}; font-size: 12px; border-radius: 12px; font-weight: bold;">
                  ${priorityLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Items:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.itemCount} item(s)</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Amount:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 16px; font-weight: bold;">${data.currency} ${formattedAmount}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Please review this request and approve or reject it as appropriate.
    </p>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/purchase-requests')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName);

  const text = `
New Purchase Request - ${data.referenceNumber}

A new purchase request has been submitted and requires your review.

Request Details:
- Reference Number: ${data.referenceNumber}
- Title: ${data.title}
- Requested By: ${data.requesterName}
- Priority: ${priorityLabel}
- Items: ${data.itemCount} item(s)
- Total Amount: ${data.currency} ${formattedAmount}

Please log in to the portal to review and approve or reject this request.
${getTenantPortalUrl(data.orgSlug, '/admin/purchase-requests')}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// PURCHASE REQUEST STATUS CHANGE EMAIL (To Requester)
// ============================================================================

interface PurchaseRequestStatusData {
  referenceNumber: string;
  userName: string;
  title: string;
  previousStatus: string;
  newStatus: string;
  reviewNotes?: string;
  reviewerName: string;
  orgSlug: string;
  orgName: string;
}

export function purchaseRequestStatusEmail(data: PurchaseRequestStatusData): { subject: string; html: string; text: string } {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'Pending': { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
    'Under Review': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    'Approved': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    'Rejected': { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
    'Completed': { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' },
  };
  const statusColor = statusColors[data.newStatus] || statusColors['Pending'];

  // Determine if this is a negative status change
  const isNegative = data.newStatus === 'Rejected';

  let statusMessage = '';
  if (data.newStatus === 'Approved') {
    statusMessage = 'Great news! Your purchase request has been approved.';
  } else if (data.newStatus === 'Rejected') {
    statusMessage = 'Unfortunately, your purchase request has been rejected.';
  } else if (data.newStatus === 'Under Review') {
    statusMessage = 'Your purchase request is now under review by the procurement team.';
  } else if (data.newStatus === 'Completed') {
    statusMessage = 'Your purchase request has been completed.';
  } else {
    statusMessage = 'The status of your purchase request has been updated.';
  }

  const subject = `Purchase Request ${data.referenceNumber} - ${data.newStatus}`;

  const html = emailWrapper(`
    <!-- Status Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${statusColor.bg}; border-left: 4px solid ${statusColor.border}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: ${statusColor.text}; font-size: 14px; margin: 0; font-weight: bold;">
            Purchase Request ${data.newStatus}
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Purchase Request Status Update</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${data.userName}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      ${statusMessage}
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Reference Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.referenceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Title:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Previous Status:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.previousStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">New Status:</td>
              <td style="padding: 8px 0;">
                <span style="display: inline-block; padding: 4px 12px; background-color: ${statusColor.bg}; color: ${statusColor.text}; font-size: 12px; border-radius: 12px; font-weight: bold; border: 1px solid ${statusColor.border};">
                  ${data.newStatus}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Reviewed By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.reviewerName}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${data.reviewNotes ? `
    <!-- Review Notes Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${BRAND_COLOR}; margin: 0 0 10px 0; font-size: 14px;">Reviewer Notes:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            ${data.reviewNotes}
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    ${isNegative ? `
    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      If you have any questions about this decision or would like to submit a revised request, please contact your manager or the procurement team.
    </p>
    ` : ''}

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/employee/purchase-requests')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View My Requests
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} Procurement Team</strong>
    </p>
  `, data.orgName);

  const text = `
Purchase Request Status Update - ${data.referenceNumber}

Dear ${data.userName},

${statusMessage}

Request Details:
- Reference Number: ${data.referenceNumber}
- Title: ${data.title}
- Previous Status: ${data.previousStatus}
- New Status: ${data.newStatus}
- Reviewed By: ${data.reviewerName}
${data.reviewNotes ? `\nReviewer Notes:\n${data.reviewNotes}` : ''}

${isNegative ? 'If you have any questions about this decision or would like to submit a revised request, please contact your manager or the procurement team.\n' : ''}
View your requests at: ${getTenantPortalUrl(data.orgSlug, '/employee/purchase-requests')}

Best regards,
${data.orgName} Procurement Team
`.trim();

  return { subject, html, text };
}

// ============================================================================
// COMPANY DOCUMENT EXPIRY ALERT EMAIL (Admin Alert)
// ============================================================================

interface CompanyDocumentExpiryAlert {
  documentType: string;
  referenceNumber: string | null;
  expiryDate: Date;
  daysRemaining: number;
  status: 'expired' | 'expiring';
  assetInfo?: string | null; // For vehicle documents
}

interface CompanyDocumentExpiryAlertData {
  documents: CompanyDocumentExpiryAlert[];
  expiredCount: number;
  expiringCount: number;
  orgSlug: string;
  orgName: string;
}

export function companyDocumentExpiryAlertEmail(data: CompanyDocumentExpiryAlertData): { subject: string; html: string; text: string } {
  const subject = `Company Document Alert: ${data.expiredCount} Expired, ${data.expiringCount} Expiring Soon`;

  const documentRows = data.documents.map(doc => {
    const isExpired = doc.status === 'expired';
    const bgColor = isExpired ? '#fef2f2' : '#fffbeb';
    const borderColor = isExpired ? '#dc3545' : '#ffc107';
    const badgeColor = isExpired ? '#dc3545' : '#ffc107';
    const statusText = isExpired ? 'EXPIRED' : 'EXPIRING';
    const daysText = isExpired
      ? `${Math.abs(doc.daysRemaining)} days ago`
      : `in ${doc.daysRemaining} days`;

    return `
      <tr>
        <td style="padding: 0 0 10px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor};">
            <tr>
              <td style="padding: 12px 16px;">
                <div style="font-weight: bold; color: #333333; font-size: 14px; margin-bottom: 4px;">
                  ${doc.documentType}
                  <span style="display: inline-block; padding: 2px 8px; background-color: ${badgeColor}; color: #ffffff; font-size: 10px; border-radius: 10px; margin-left: 8px;">
                    ${statusText}
                  </span>
                </div>
                <div style="color: #555555; font-size: 13px;">
                  Expires: ${formatDate(doc.expiryDate)} (${daysText})
                </div>
                ${doc.referenceNumber ? `<div style="color: #666666; font-size: 12px;">Ref: ${doc.referenceNumber}</div>` : ''}
                ${doc.assetInfo ? `<div style="color: #666666; font-size: 12px;">Vehicle: ${doc.assetInfo}</div>` : ''}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Company Document Expiry Alert</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      The following company documents require your attention:
    </p>

    <!-- Summary Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 20px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="text-align: center; padding: 10px;">
                <div style="font-size: 28px; font-weight: bold; color: #dc3545;">${data.expiredCount}</div>
                <div style="font-size: 12px; color: #666666;">Expired</div>
              </td>
              <td style="text-align: center; padding: 10px;">
                <div style="font-size: 28px; font-weight: bold; color: #ffc107;">${data.expiringCount}</div>
                <div style="font-size: 12px; color: #666666;">Expiring Soon</div>
              </td>
              <td style="text-align: center; padding: 10px;">
                <div style="font-size: 28px; font-weight: bold; color: ${BRAND_COLOR};">${data.documents.length}</div>
                <div style="font-size: 12px; color: #666666;">Total Documents</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Documents List -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      ${documentRows}
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/company-documents')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View Company Documents
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 20px;">
      Please renew these documents before they expire to avoid any compliance issues.
    </p>
  `, data.orgName);

  const documentsList = data.documents.map(doc => {
    const isExpired = doc.status === 'expired';
    const daysText = isExpired
      ? `(Expired ${Math.abs(doc.daysRemaining)} days ago)`
      : `(Expires in ${doc.daysRemaining} days)`;
    return `- ${doc.documentType}: ${formatDate(doc.expiryDate)} ${daysText}${doc.referenceNumber ? ` [${doc.referenceNumber}]` : ''}`;
  }).join('\n');

  const text = `
Company Document Expiry Alert

Summary:
- Expired: ${data.expiredCount}
- Expiring Soon: ${data.expiringCount}
- Total: ${data.documents.length}

Documents requiring attention:
${documentsList}

View documents at: ${getTenantPortalUrl(data.orgSlug, '/admin/company-documents')}

Please renew these documents before they expire to avoid any compliance issues.

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// NEW ORGANIZATION SIGNUP NOTIFICATION (Super Admin)
// ============================================================================

interface NewOrganizationSignupData {
  organizationName: string;
  organizationSlug: string;
  adminEmail: string;
  adminName?: string | null;
  industry?: string | null;
  companySize?: string | null;
  signupDate: Date;
}

export function newOrganizationSignupEmail(data: NewOrganizationSignupData): { subject: string; html: string; text: string } {
  const subject = `🎉 New Organization Signup: ${data.organizationName}`;

  const portalUrl = getTenantPortalUrl(data.organizationSlug, '');
  const superAdminUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN?.includes('localhost') ? 'http' : 'https'}://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'}/super-admin/organizations`;

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Organization Has Joined Durj</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new organization has signed up for Durj. Here are the details:
    </p>

    <!-- Organization Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid ${BRAND_COLOR}; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${BRAND_COLOR}; margin: 0 0 15px 0; font-size: 16px;">Organization Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Organization Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.organizationName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subdomain:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                <a href="${portalUrl}" style="color: ${BRAND_COLOR}; text-decoration: none;">${data.organizationSlug}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Admin Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.adminEmail}</td>
            </tr>
            ${data.adminName ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Admin Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.adminName}</td>
            </tr>
            ` : ''}
            ${data.industry ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Industry:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.industry}</td>
            </tr>
            ` : ''}
            ${data.companySize ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Company Size:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.companySize}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Signup Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.signupDate)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${superAdminUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View All Organizations
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 20px;">
      The organization admin will receive a separate email with setup instructions.
    </p>
  `, 'Durj Platform');

  const text = `
New Organization Has Joined Durj

A new organization has signed up for Durj. Here are the details:

Organization Details:
- Organization Name: ${data.organizationName}
- Subdomain: ${data.organizationSlug}
- Admin Email: ${data.adminEmail}
${data.adminName ? `- Admin Name: ${data.adminName}` : ''}
${data.industry ? `- Industry: ${data.industry}` : ''}
${data.companySize ? `- Company Size: ${data.companySize}` : ''}
- Signup Date: ${formatDate(data.signupDate)}

View all organizations at: ${superAdminUrl}

The organization admin will receive a separate email with setup instructions.

Best regards,
Durj Platform
`.trim();

  return { subject, html, text };
}
