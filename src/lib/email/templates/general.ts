/**
 * @file general.ts
 * @description General email templates for Durj platform.
 * @module lib/email/templates
 */

// Default brand color: #0f172a (slate-900)
// Organization's primaryColor can override this via the primaryColor parameter

import {
  DEFAULT_BRAND_COLOR,
  escapeHtml,
  getTenantPortalUrl,
  emailWrapper,
} from '../utils';

// Re-export for backwards compatibility if needed
export { DEFAULT_BRAND_COLOR };

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
// HELPER FUNCTIONS (local)
// ============================================================================

// ============================================================================
// SUPPLIER APPROVAL EMAIL
// ============================================================================

interface SupplierApprovalData {
  companyName: string;
  serviceCategory: string;
  approvalDate: Date;
  orgName: string;
  primaryColor?: string;
}

export function supplierApprovalEmail(data: SupplierApprovalData): { subject: string; html: string; text: string } {
  const subject = `Supplier Registration Approved - ${data.companyName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Congratulations! Your Supplier Registration is Approved</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${escapeHtml(data.companyName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      We are pleased to inform you that your supplier registration with ${escapeHtml(data.orgName)} has been approved. You are now an approved vendor in our system.
    </p>

    <!-- Supplier Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Your Supplier Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Company Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.companyName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Service Category:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.serviceCategory)}</td>
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
  `, data.orgName, brandColor);

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
  primaryColor?: string;
}

export function assetAssignmentEmail(data: AssetAssignmentData): { subject: string; html: string; text: string } {
  const subject = `Asset Assigned: ${data.assetTag} - ${data.brand} ${data.model}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Asset Assignment Notification</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${escapeHtml(data.userName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new asset has been assigned to you. Please review the details below and acknowledge receipt of this equipment.
    </p>

    <!-- Asset Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Asset Details</h3>
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
  `, data.orgName, brandColor);

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
  primaryColor?: string;
}

export function changeRequestEmail(data: ChangeRequestData): { subject: string; html: string; text: string } {
  const subject = `Profile Change Request: ${data.employeeName} - ${data.fieldName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

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
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Employee Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.employeeName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Employee Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.employeeEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Field to Change:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.fieldName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Current Value:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.currentValue) || 'Not set'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Requested Value:</td>
              <td style="padding: 8px 0; color: ${brandColor}; font-size: 14px; font-weight: bold;">${escapeHtml(data.requestedValue)}</td>
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
          <h4 style="color: ${brandColor}; margin: 0 0 10px 0; font-size: 14px;">Reason for Change:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            ${escapeHtml(data.reason) || 'No reason provided'}
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

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
  primaryColor?: string;
}

export function welcomeUserEmail(data: WelcomeUserData): { subject: string; html: string; text: string } {
  const subject = `Welcome to ${data.orgName} - ${data.userName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

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
      Dear <strong>${escapeHtml(data.userName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your account has been created on the ${data.orgName} Portal. You can now access the system using your company email address.
    </p>

    <!-- Account Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Your Account Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.userName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.userEmail)}</td>
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
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
  `, data.orgName, brandColor);

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
  primaryColor?: string;
}

export function welcomeUserWithPasswordSetupEmail(data: WelcomeUserWithPasswordSetupData): { subject: string; html: string; text: string } {
  const subject = `Welcome! Set Up Your Password - ${data.orgName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  // Format role for display
  const roleDisplay = data.userRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Get tenant-specific password setup URL
  const setupUrl = getTenantPortalUrl(data.orgSlug, `/set-password/${data.setupToken}`);

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Welcome to ${data.orgName}!</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${escapeHtml(data.userName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your account has been created on the ${data.orgName} Portal. To get started, please set up your password using the link below.
    </p>

    <!-- Account Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Your Account Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.userName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.userEmail)}</td>
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
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
  `, data.orgName, brandColor);

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
// ORGANIZATION INVITATION EMAIL
// For inviting members to join an organization (SSO authentication)
// ============================================================================

interface OrganizationInvitationEmailData {
  userName: string;
  userEmail: string;
  userRole: string;
  orgSlug: string;
  orgName: string;
  inviteToken: string;
  authMethods: {
    hasGoogle: boolean;
    hasMicrosoft: boolean;
  };
  designation?: string | null;
  employeeCode?: string | null;
  primaryColor?: string;
}

export function organizationInvitationEmail(data: OrganizationInvitationEmailData): { subject: string; html: string; text: string } {
  const subject = `You're invited to join ${data.orgName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  // Format role for display
  const roleDisplay = data.userRole.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Get invitation URL
  const inviteUrl = getTenantPortalUrl(data.orgSlug, `/invite/${data.inviteToken}`);

  // Build sign-in method description
  const authMethodDescription = data.authMethods.hasGoogle && data.authMethods.hasMicrosoft
    ? 'Google or Microsoft account'
    : data.authMethods.hasGoogle
      ? 'Google account'
      : 'Microsoft account';

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">You're Invited to Join ${data.orgName}!</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${escapeHtml(data.userName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      You have been invited to join <strong>${data.orgName}</strong>. Click the button below to accept this invitation and set up your account.
    </p>

    <!-- Account Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Your Account Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.userName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.userEmail)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Role:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${roleDisplay}</td>
            </tr>
            ${data.employeeCode ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Employee ID:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.employeeCode}</td>
            </tr>
            ` : ''}
            ${data.designation ? `
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Designation:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.designation}</td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${inviteUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
      <strong>How to join:</strong> Click the button above and sign in with your ${authMethodDescription}. Your account will be automatically linked to ${data.orgName}.
    </p>

    <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0 0 20px 0;">
      This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Welcome aboard!<br>
      <strong>${data.orgName} Team</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
You're Invited to Join ${data.orgName}!

Dear ${data.userName},

You have been invited to join ${data.orgName}. Visit the link below to accept this invitation and set up your account.

Your Account Details:
- Name: ${data.userName}
- Email: ${data.userEmail}
- Role: ${roleDisplay}
${data.employeeCode ? `- Employee ID: ${data.employeeCode}` : ''}
${data.designation ? `- Designation: ${data.designation}` : ''}

Accept Invitation: ${inviteUrl}

How to join: Click the link above and sign in with your ${authMethodDescription}. Your account will be automatically linked to ${data.orgName}.

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

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
  primaryColor?: string;
}

export function documentExpiryAlertEmail(data: DocumentExpiryAlertData): { subject: string; html: string; text: string } {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
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
      Dear <strong>${escapeHtml(data.userName)}</strong>,
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Update My Profile
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} HR Team</strong>
    </p>
  `, data.orgName, brandColor);

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
  primaryColor?: string;
}

export function adminDocumentExpiryAlertEmail(data: AdminDocumentExpiryAlertData): { subject: string; html: string; text: string } {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View All Expiring Documents
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

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
  primaryColor?: string;
}

export function newSupplierRegistrationEmail(data: NewSupplierRegistrationData): { subject: string; html: string; text: string } {
  const subject = `New Supplier Registration: ${data.companyName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${brandColor}; border-radius: 4px; margin: 0 0 25px 0;">
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
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Supplier Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Company Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.companyName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Category:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.category)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Contact Person:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.contactName) || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Contact Email:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.contactEmail) || 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Country:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.country) || 'Not provided'}</td>
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Supplier
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

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
// SPEND REQUEST SUBMITTED EMAIL (To Admins)
// ============================================================================

interface SpendRequestSubmittedData {
  referenceNumber: string;
  requesterName: string;
  title: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  priority: string;
  orgSlug: string;
  orgName: string;
  primaryColor?: string;
}

export function spendRequestSubmittedEmail(data: SpendRequestSubmittedData): { subject: string; html: string; text: string } {
  const subject = `New Spend Request: ${data.referenceNumber} - ${data.title}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

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
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${brandColor}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #0c5460; font-size: 14px; margin: 0; font-weight: bold;">
            New Spend Request Submitted
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Spend Request</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new spend request has been submitted and requires your review.
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Reference Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.referenceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Title:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.title)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Requested By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.requesterName)}</td>
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
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/spend-requests')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
New Spend Request - ${data.referenceNumber}

A new spend request has been submitted and requires your review.

Request Details:
- Reference Number: ${data.referenceNumber}
- Title: ${data.title}
- Requested By: ${data.requesterName}
- Priority: ${priorityLabel}
- Items: ${data.itemCount} item(s)
- Total Amount: ${data.currency} ${formattedAmount}

Please log in to the portal to review and approve or reject this request.
${getTenantPortalUrl(data.orgSlug, '/admin/spend-requests')}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// SPEND REQUEST STATUS CHANGE EMAIL (To Requester)
// ============================================================================

interface SpendRequestStatusData {
  referenceNumber: string;
  userName: string;
  title: string;
  previousStatus: string;
  newStatus: string;
  reviewNotes?: string;
  reviewerName: string;
  orgSlug: string;
  orgName: string;
  primaryColor?: string;
}

export function spendRequestStatusEmail(data: SpendRequestStatusData): { subject: string; html: string; text: string } {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
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
    statusMessage = 'Great news! Your spend request has been approved.';
  } else if (data.newStatus === 'Rejected') {
    statusMessage = 'Unfortunately, your spend request has been rejected.';
  } else if (data.newStatus === 'Under Review') {
    statusMessage = 'Your spend request is now under review by the approvers.';
  } else if (data.newStatus === 'Completed') {
    statusMessage = 'Your spend request has been completed.';
  } else {
    statusMessage = 'The status of your spend request has been updated.';
  }

  const subject = `Spend Request ${data.referenceNumber} - ${data.newStatus}`;

  const html = emailWrapper(`
    <!-- Status Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${statusColor.bg}; border-left: 4px solid ${statusColor.border}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: ${statusColor.text}; font-size: 14px; margin: 0; font-weight: bold;">
            Spend Request ${data.newStatus}
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Spend Request Status Update</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${escapeHtml(data.userName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      ${statusMessage}
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Reference Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.referenceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Title:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.title)}</td>
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
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.reviewerName)}</td>
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
          <h4 style="color: ${brandColor}; margin: 0 0 10px 0; font-size: 14px;">Reviewer Notes:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            ${escapeHtml(data.reviewNotes)}
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
          <a href="${getTenantPortalUrl(data.orgSlug, '/employee/spend-requests')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View My Requests
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} Procurement Team</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
Spend Request Status Update - ${data.referenceNumber}

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
View your requests at: ${getTenantPortalUrl(data.orgSlug, '/employee/spend-requests')}

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
  primaryColor?: string;
}

export function companyDocumentExpiryAlertEmail(data: CompanyDocumentExpiryAlertData): { subject: string; html: string; text: string } {
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
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
                <div style="font-size: 28px; font-weight: bold; color: ${brandColor};">${data.documents.length}</div>
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View Company Documents
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 20px;">
      Please renew these documents before they expire to avoid any compliance issues.
    </p>
  `, data.orgName, brandColor);

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
// LEAVE REQUEST SUBMITTED EMAIL (To Admins/Approvers)
// ============================================================================

interface LeaveRequestSubmittedData {
  requestNumber: string;
  requesterName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string | null;
  orgSlug: string;
  orgName: string;
  primaryColor?: string;
}

export function leaveRequestSubmittedEmail(data: LeaveRequestSubmittedData): { subject: string; html: string; text: string } {
  const subject = `Leave Request: ${data.requestNumber} - ${data.requesterName} (${data.leaveType})`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-left: 4px solid ${brandColor}; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #0c5460; font-size: 14px; margin: 0; font-weight: bold;">
            New Leave Request Pending Approval
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Leave Request Submitted</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new leave request has been submitted and requires your approval.
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Request Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Employee:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.requesterName)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Leave Type:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.leaveType)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Start Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">End Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Days:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 16px; font-weight: bold;">${data.totalDays} day${data.totalDays === 1 ? '' : 's'}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${data.reason ? `
    <!-- Reason Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${brandColor}; margin: 0 0 10px 0; font-size: 14px;">Reason:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            ${escapeHtml(data.reason)}
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Please review this request and approve or reject it as appropriate.
    </p>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/admin/leave/requests')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Request
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
Leave Request - ${data.requestNumber}

A new leave request has been submitted and requires your approval.

Request Details:
- Request Number: ${data.requestNumber}
- Employee: ${data.requesterName}
- Leave Type: ${data.leaveType}
- Start Date: ${formatDate(data.startDate)}
- End Date: ${formatDate(data.endDate)}
- Total Days: ${data.totalDays} day${data.totalDays === 1 ? '' : 's'}
${data.reason ? `\nReason:\n${data.reason}` : ''}

Please log in to the portal to review and approve or reject this request.
${getTenantPortalUrl(data.orgSlug, '/admin/leave/requests')}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// LEAVE REQUEST APPROVED EMAIL (To Requester)
// ============================================================================

interface LeaveApprovedData {
  requestNumber: string;
  employeeName: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  approverName: string;
  approverNotes?: string | null;
  orgSlug: string;
  orgName: string;
  primaryColor?: string;
}

export function leaveApprovedEmail(data: LeaveApprovedData): { subject: string; html: string; text: string } {
  const subject = `Leave Approved: ${data.requestNumber} - ${data.leaveType} (${data.totalDays} day${data.totalDays === 1 ? '' : 's'})`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  const html = emailWrapper(`
    <!-- Success Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #155724; font-size: 14px; margin: 0; font-weight: bold;">
            Your Leave Request Has Been Approved
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Leave Request Approved</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Dear <strong>${escapeHtml(data.employeeName)}</strong>,
    </p>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      Your leave request has been approved. Please find the details below.
    </p>

    <!-- Request Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Approved Leave Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Request Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.requestNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Leave Type:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.leaveType)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Start Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">End Date:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${formatDate(data.endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Days:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 16px; font-weight: bold;">${data.totalDays} day${data.totalDays === 1 ? '' : 's'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Approved By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.approverName)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${data.approverNotes ? `
    <!-- Approver Notes Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8f4fd; border-radius: 8px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 20px;">
          <h4 style="color: ${brandColor}; margin: 0 0 10px 0; font-size: 14px;">Approver Notes:</h4>
          <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">
            ${escapeHtml(data.approverNotes)}
          </p>
        </td>
      </tr>
    </table>
    ` : ''}

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      You can view all your leave requests by logging into the portal.
    </p>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${getTenantPortalUrl(data.orgSlug, '/employee/leave')}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View My Leave
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName} HR Team</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
Leave Request Approved - ${data.requestNumber}

Dear ${data.employeeName},

Your leave request has been approved.

Approved Leave Details:
- Request Number: ${data.requestNumber}
- Leave Type: ${data.leaveType}
- Start Date: ${formatDate(data.startDate)}
- End Date: ${formatDate(data.endDate)}
- Total Days: ${data.totalDays} day${data.totalDays === 1 ? '' : 's'}
- Approved By: ${data.approverName}
${data.approverNotes ? `\nApprover Notes:\n${data.approverNotes}` : ''}

You can view all your leave requests by logging into the portal.
${getTenantPortalUrl(data.orgSlug, '/employee/leave')}

Best regards,
${data.orgName} HR Team
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
  primaryColor?: string;
}

export function newOrganizationSignupEmail(data: NewOrganizationSignupData): { subject: string; html: string; text: string } {
  const subject = `🎉 New Organization Signup: ${data.organizationName}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;

  const portalUrl = getTenantPortalUrl(data.organizationSlug, '');
  const superAdminUrl = `${process.env.NEXT_PUBLIC_APP_DOMAIN?.includes('localhost') ? 'http' : 'https'}://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000'}/super-admin/organizations`;

  const html = emailWrapper(`
    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">New Organization Has Joined Durj</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A new organization has signed up for Durj. Here are the details:
    </p>

    <!-- Organization Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid ${brandColor}; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Organization Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Organization Name:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${data.organizationName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Subdomain:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">
                <a href="${portalUrl}" style="color: ${brandColor}; text-decoration: none;">${data.organizationSlug}</a>
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
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View All Organizations
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #888888; font-size: 12px; margin-top: 20px;">
      The organization admin will receive a separate email with setup instructions.
    </p>
  `, 'Durj Platform', brandColor);

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

// ============================================================================
// PAYROLL SUBMITTED EMAIL (To Admins)
// ============================================================================

interface PayrollSubmittedData {
  referenceNumber: string;
  periodLabel: string;
  employeeCount: number;
  totalGross: string;
  totalNet: string;
  currency: string;
  submitterName: string;
  orgSlug: string;
  orgName: string;
  primaryColor?: string;
}

export function payrollSubmittedEmail(data: PayrollSubmittedData): { subject: string; html: string; text: string } {
  const subject = `Payroll Submitted for Approval - ${data.referenceNumber}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const portalUrl = getTenantPortalUrl(data.orgSlug, `/admin/payroll/runs`);

  const html = emailWrapper(`
    <!-- Alert Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #856404; font-size: 14px; margin: 0; font-weight: bold;">
            Action Required: Payroll Pending Approval
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Payroll Submitted for Approval</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      A payroll run has been submitted for your approval. Please review the details below.
    </p>

    <!-- Payroll Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Payroll Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Reference Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.referenceNumber)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Pay Period:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.periodLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Employees:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.employeeCount} employee${data.employeeCount === 1 ? '' : 's'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Gross:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.currency} ${data.totalGross}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Net:</td>
              <td style="padding: 8px 0; color: ${brandColor}; font-size: 14px; font-weight: bold;">${data.currency} ${data.totalNet}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Submitted By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.submitterName)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${portalUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            Review Payroll
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
Payroll Submitted for Approval - Action Required

A payroll run has been submitted for your approval.

Payroll Details:
- Reference Number: ${data.referenceNumber}
- Pay Period: ${data.periodLabel}
- Employees: ${data.employeeCount} employee${data.employeeCount === 1 ? '' : 's'}
- Total Gross: ${data.currency} ${data.totalGross}
- Total Net: ${data.currency} ${data.totalNet}
- Submitted By: ${data.submitterName}

Please log in to review and approve the payroll:
${portalUrl}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}

// ============================================================================
// PAYROLL APPROVED EMAIL (To Admins)
// ============================================================================

interface PayrollApprovedData {
  referenceNumber: string;
  periodLabel: string;
  employeeCount: number;
  totalNet: string;
  currency: string;
  approverName: string;
  orgSlug: string;
  orgName: string;
  primaryColor?: string;
}

export function payrollApprovedEmail(data: PayrollApprovedData): { subject: string; html: string; text: string } {
  const subject = `Payroll Approved - ${data.referenceNumber}`;
  const brandColor = data.primaryColor || DEFAULT_BRAND_COLOR;
  const portalUrl = getTenantPortalUrl(data.orgSlug, `/admin/payroll/runs`);

  const html = emailWrapper(`
    <!-- Success Banner -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #d4edda; border-left: 4px solid #28a745; border-radius: 4px; margin: 0 0 25px 0;">
      <tr>
        <td style="padding: 15px 20px;">
          <p style="color: #155724; font-size: 14px; margin: 0; font-weight: bold;">
            ✓ Payroll Approved
          </p>
        </td>
      </tr>
    </table>

    <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 20px;">Payroll Has Been Approved</h2>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
      The following payroll run has been approved and is ready for processing.
    </p>

    <!-- Payroll Details Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 25px 0;">
      <tr>
        <td style="padding: 25px;">
          <h3 style="color: ${brandColor}; margin: 0 0 15px 0; font-size: 16px;">Payroll Details</h3>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px; width: 40%;">Reference Number:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px; font-weight: bold;">${escapeHtml(data.referenceNumber)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Pay Period:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.periodLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Employees:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${data.employeeCount} employee${data.employeeCount === 1 ? '' : 's'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Total Net Payable:</td>
              <td style="padding: 8px 0; color: ${brandColor}; font-size: 14px; font-weight: bold;">${data.currency} ${data.totalNet}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666666; font-size: 14px;">Approved By:</td>
              <td style="padding: 8px 0; color: #333333; font-size: 14px;">${escapeHtml(data.approverName)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <a href="${portalUrl}"
             style="display: inline-block; padding: 14px 30px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
            View Payroll
          </a>
        </td>
      </tr>
    </table>

    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0;">
      Best regards,<br>
      <strong>${data.orgName}</strong>
    </p>
  `, data.orgName, brandColor);

  const text = `
Payroll Approved - ${data.referenceNumber}

The following payroll run has been approved and is ready for processing.

Payroll Details:
- Reference Number: ${data.referenceNumber}
- Pay Period: ${data.periodLabel}
- Employees: ${data.employeeCount} employee${data.employeeCount === 1 ? '' : 's'}
- Total Net Payable: ${data.currency} ${data.totalNet}
- Approved By: ${data.approverName}

View the payroll at:
${portalUrl}

Best regards,
${data.orgName}
`.trim();

  return { subject, html, text };
}
