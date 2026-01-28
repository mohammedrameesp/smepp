/**
 * @file index.ts
 * @description Barrel export for all email templates.
 * @module lib/email/templates
 */

// Shared types (re-export from parent for convenience)
export type { EmailTemplateResult } from '../types';

// General templates
export {
  supplierApprovalEmail,
  assetAssignmentEmail,
  changeRequestEmail,
  welcomeUserEmail,
  welcomeUserWithPasswordSetupEmail,
  organizationInvitationEmail,
  documentExpiryAlertEmail,
  adminDocumentExpiryAlertEmail,
  newSupplierRegistrationEmail,
  spendRequestSubmittedEmail,
  spendRequestStatusEmail,
  companyDocumentExpiryAlertEmail,
  newOrganizationSignupEmail,
  leaveRequestSubmittedEmail,
  leaveApprovedEmail,
  payrollSubmittedEmail,
  payrollApprovedEmail,
  DEFAULT_BRAND_COLOR,
} from './general';

// Asset request templates
export {
  assetRequestSubmittedEmail,
  assetAssignmentPendingEmail,
  assetAssignmentAcceptedEmail,
  assetAssignmentDeclinedEmail,
  assetReturnRequestEmail,
  assetRequestApprovedEmail,
  assetRequestRejectedEmail,
  assetReturnApprovedEmail,
  assetReturnRejectedEmail,
  assetUnassignedEmail,
} from './asset-requests';

// Error alert templates (super admin notifications)
export { systemErrorAlertEmail } from './error-alerts';
// Backwards compatibility alias
export type { EmailTemplate } from './error-alerts';

// Email failure alert templates (super admin notifications)
export { emailFailureAlertEmail } from './email-failures';
// Backwards compatibility alias
export type { EmailFailureTemplate } from './email-failures';
